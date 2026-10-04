import type { DB } from "./db";
import { PARAMETROS, getParamDef, validarParametro, valoresPadrao } from "../src/engine/parameters";
import { registrarAuditoria } from "./audit";

const enc = (v: unknown) => (v === null || v === undefined ? null : JSON.stringify(v));
const dec = (s: string | null): unknown => (s === null ? null : JSON.parse(s));

/** Insere parâmetros que ainda não existem no banco (não sobrescreve valores existentes). */
export function semearConfiguracoes(db: DB): void {
  const ins = db.prepare("INSERT OR IGNORE INTO settings (chave, valor) VALUES (?, ?)");
  const padrao = valoresPadrao();
  db.transaction(() => {
    for (const [k, v] of Object.entries(padrao)) ins.run(k, enc(v));
  })();
}

export interface Configuracao {
  chave: string;
  valor: unknown;
  updated_at: string;
  updated_by: string | null;
}

export function listarConfiguracoes(db: DB): Configuracao[] {
  const rows = db
    .prepare(
      `SELECT s.chave, s.valor, s.updated_at, u.nome AS updated_by
       FROM settings s LEFT JOIN users u ON u.id = s.updated_by`,
    )
    .all() as { chave: string; valor: string | null; updated_at: string; updated_by: string | null }[];
  const ordem = new Map(PARAMETROS.map((p, i) => [p.chave, i]));
  return rows
    .filter((r) => ordem.has(r.chave))
    .sort((a, b) => ordem.get(a.chave)! - ordem.get(b.chave)!)
    .map((r) => ({ ...r, valor: dec(r.valor) }));
}

export function valoresAtuais(db: DB): Record<string, unknown> {
  return Object.fromEntries(listarConfiguracoes(db).map((c) => [c.chave, c.valor]));
}

export class ErroValidacao extends Error {
  constructor(public erros: string[]) {
    super(erros.join(" "));
  }
}

/**
 * Atualiza parâmetros validando tudo antes de gravar. Grava histórico (antes/depois)
 * e auditoria em uma única transação. Retorna as chaves efetivamente alteradas.
 */
export function atualizarConfiguracoes(
  db: DB,
  userId: number,
  alteracoes: Record<string, unknown>,
  origem: "edicao" | "importacao" = "edicao",
): string[] {
  const erros: string[] = [];
  const validados: Record<string, unknown> = {};
  for (const [chave, raw] of Object.entries(alteracoes)) {
    const def = getParamDef(chave);
    if (!def) { erros.push(`Parâmetro desconhecido: ${chave}.`); continue; }
    const r = validarParametro(def, raw);
    if (!r.ok) erros.push(r.error);
    else validados[chave] = r.value;
  }
  if (erros.length) throw new ErroValidacao(erros);

  const atuais = valoresAtuais(db);
  const alteradas: string[] = [];
  const upd = db.prepare(
    "UPDATE settings SET valor = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_by = ? WHERE chave = ?",
  );
  const hist = db.prepare(
    "INSERT INTO settings_history (chave, valor_anterior, valor_novo, user_id, origem) VALUES (?, ?, ?, ?, ?)",
  );
  db.transaction(() => {
    for (const [chave, novo] of Object.entries(validados)) {
      const antes = enc(atuais[chave] ?? null);
      const depois = enc(novo);
      if (antes === depois) continue;
      upd.run(depois, userId, chave);
      hist.run(chave, antes, depois, userId, origem);
      alteradas.push(chave);
    }
    if (alteradas.length) {
      registrarAuditoria(db, userId, origem === "importacao" ? "importar" : "alterar", "configuracoes", null, { chaves: alteradas });
    }
  })();
  return alteradas;
}

export interface EntradaHistorico {
  id: number;
  chave: string;
  rotulo: string;
  valor_anterior: unknown;
  valor_novo: unknown;
  usuario: string | null;
  origem: string;
  changed_at: string;
}

export function listarHistorico(db: DB, chave?: string, limite = 500): EntradaHistorico[] {
  const sql = `SELECT h.*, u.nome AS usuario FROM settings_history h LEFT JOIN users u ON u.id = h.user_id
     ${chave ? "WHERE h.chave = ?" : ""} ORDER BY h.id DESC LIMIT ?`;
  const params: unknown[] = chave ? [chave, limite] : [limite];
  const rows = db.prepare(sql).all(...params) as {
    id: number; chave: string; valor_anterior: string | null; valor_novo: string | null;
    usuario: string | null; origem: string; changed_at: string;
  }[];
  return rows.map((r) => ({
    ...r,
    rotulo: getParamDef(r.chave)?.rotulo ?? r.chave,
    valor_anterior: dec(r.valor_anterior),
    valor_novo: dec(r.valor_novo),
  }));
}

export const FORMATO_EXPORTACAO = "compras-inteligentes/configuracoes";

export function exportarConfiguracoes(db: DB) {
  return {
    formato: FORMATO_EXPORTACAO,
    versao: 1,
    exportado_em: new Date().toISOString(),
    parametros: valoresAtuais(db),
  };
}

export function importarConfiguracoes(db: DB, userId: number, json: unknown): string[] {
  if (typeof json !== "object" || json === null) throw new ErroValidacao(["Arquivo inválido."]);
  const o = json as Record<string, unknown>;
  if (o["formato"] !== FORMATO_EXPORTACAO) throw new ErroValidacao(["Formato de arquivo não reconhecido."]);
  const p = o["parametros"];
  if (typeof p !== "object" || p === null || Array.isArray(p)) throw new ErroValidacao(["Parâmetros ausentes."]);
  return atualizarConfiguracoes(db, userId, p as Record<string, unknown>, "importacao");
}
