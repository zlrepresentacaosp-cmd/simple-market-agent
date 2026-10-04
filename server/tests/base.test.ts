// @vitest-environment node
import { describe, expect, it, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { abrirBanco, type DB } from "../db";
import { MIGRATIONS, migrate } from "../db/migrations";
import { construirApp, COOKIE_SESSAO } from "../app";
import { autenticar, criarUsuario, hashSenha, verificarSenha } from "../auth";
import {
  atualizarConfiguracoes,
  exportarConfiguracoes,
  importarConfiguracoes,
  listarHistorico,
  valoresAtuais,
  ErroValidacao,
} from "../settings";
import {
  PARAMETROS,
  validarParametro,
  getParamDef,
  parseNumeroBR,
} from "../../src/engine/parameters";
import { pode } from "../../src/engine/permissions";
import { formatarMoeda, formatarDataHora } from "../../src/engine/format";

let db: DB;
beforeEach(() => {
  db = abrirBanco(":memory:");
});

describe("migrações", () => {
  it("aplica todas e é idempotente", () => {
    const raw = new Database(":memory:");
    expect(migrate(raw)).toEqual(MIGRATIONS.map((m) => m.id));
    expect(migrate(raw)).toEqual([]);
    const tabelas = (
      raw.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]
    ).map((t) => t.name);
    for (const t of [
      "users",
      "sessions",
      "settings",
      "settings_history",
      "audit_log",
      "schema_migrations",
    ]) {
      expect(tabelas).toContain(t);
    }
  });

  it("restringe papéis no banco", () => {
    expect(() =>
      db
        .prepare(
          "INSERT INTO users (username, nome, password_hash, papel) VALUES ('x','x','h','admin')",
        )
        .run(),
    ).toThrow();
  });
});

describe("parâmetros iniciais", () => {
  it("semeia valores da especificação", () => {
    const v = valoresAtuais(db);
    expect(v["faturamento_medio_mensal"]).toBe(260000);
    expect(v["margem_bruta_alvo"]).toBe(35);
    expect(v["orcamento_compras_mensal"]).toBe(169000);
    expect(v["salarios_referencia"]).toBe(8900);
    expect([v["cobertura_dias_a"], v["cobertura_dias_b"], v["cobertura_dias_c"]]).toEqual([
      7, 14, 21,
    ]);
    expect([v["seguranca_dias_a"], v["seguranca_dias_b"], v["seguranca_dias_c"]]).toEqual([
      2, 2, 0,
    ]);
    expect(v["teto_hortifruti_dias"]).toBe(3);
    expect(v["teto_acougue_dias"]).toBe(3);
    expect(v["teto_padaria_matinais_dias"]).toBe(2);
    expect(v["teto_frios_congelados_dias"]).toBe(7);
    expect(v["giro_minimo"]).toBe(3);
    expect(v["horario_automacao"]).toBe("08:00");
    expect(v["fuso_horario"]).toBe("America/Sao_Paulo");
  });

  it("campos [PREENCHER] começam vazios", () => {
    const v = valoresAtuais(db);
    const preencher = PARAMETROS.filter((p) => p.preencher);
    expect(preencher.length).toBeGreaterThan(0);
    for (const p of preencher) expect(v[p.chave]).toBeNull();
    for (const k of [
      "concorrentes",
      "regime_tributario",
      "aliquota_tributaria",
      "aluguel",
      "energia",
      "pro_labore",
      "outros_custos_fixos",
      "encargos_percentual",
      "fornecedores_prazos",
      "email_notificacoes",
    ]) {
      expect(getParamDef(k)?.preencher).toBe(true);
    }
  });

  it("semear de novo não sobrescreve", () => {
    const u = criarUsuario(db, {
      username: "gestora",
      nome: "G",
      senha: "senhaforte1",
      papel: "gestor",
    });
    atualizarConfiguracoes(db, u.id, { margem_bruta_alvo: 30 });
    expect(valoresAtuais(db)["margem_bruta_alvo"]).toBe(30);
  });
});

describe("engine", () => {
  it("valida e normaliza", () => {
    expect(parseNumeroBR("1.234,56")).toBe(1234.56);
    expect(validarParametro(getParamDef("margem_bruta_alvo")!, "101").ok).toBe(false);
    expect(validarParametro(getParamDef("cobertura_dias_a")!, "1,5").ok).toBe(false);
    expect(validarParametro(getParamDef("faturamento_medio_mensal")!, "").ok).toBe(false);
    expect(validarParametro(getParamDef("aluguel")!, "").ok).toBe(true);
    expect(validarParametro(getParamDef("horario_automacao")!, "25:00").ok).toBe(false);
    expect(validarParametro(getParamDef("concorrentes")!, [{ nome: "X", url: "ftp://x" }]).ok).toBe(
      false,
    );
  });
  it("formata pt-BR", () => {
    expect(formatarMoeda(1234.56)).toBe("R$ 1.234,56");
    expect(formatarDataHora("2026-01-15T11:00:00Z")).toBe("15/01/2026 08:00");
  });
  it("permissões", () => {
    expect(pode("gestor", "configuracoes.editar")).toBe(true);
    expect(pode("operacional", "configuracoes.editar")).toBe(false);
    expect(pode("operacional", "estoque.contar")).toBe(true);
    expect(pode("operacional", "precos.revisar")).toBe(true);
    expect(pode("operacional", "usuarios.gerenciar")).toBe(false);
  });
});

describe("senhas e autenticação", () => {
  it("hash não guarda a senha em texto", () => {
    const h = hashSenha("minhasenha123");
    expect(h).not.toContain("minhasenha123");
    expect(h.startsWith("scrypt$")).toBe(true);
    expect(verificarSenha("minhasenha123", h)).toBe(true);
    expect(verificarSenha("errada", h)).toBe(false);
    expect(hashSenha("minhasenha123")).not.toBe(h);
  });
  it("rejeita senha curta e usuário duplicado", () => {
    expect(() =>
      criarUsuario(db, { username: "a12", nome: "A", senha: "123", papel: "gestor" }),
    ).toThrow();
    criarUsuario(db, { username: "abc", nome: "A", senha: "senhaforte1", papel: "gestor" });
    expect(() =>
      criarUsuario(db, { username: "ABC", nome: "A", senha: "senhaforte1", papel: "gestor" }),
    ).toThrow();
  });
  it("autentica", () => {
    criarUsuario(db, { username: "abc", nome: "A", senha: "senhaforte1", papel: "gestor" });
    expect(autenticar(db, "abc", "senhaforte1")?.username).toBe("abc");
    expect(autenticar(db, "abc", "x")).toBeNull();
  });
});

describe("histórico e auditoria", () => {
  it("registra antes/depois/quem/quando", () => {
    const u = criarUsuario(db, {
      username: "gestora",
      nome: "Gestora",
      senha: "senhaforte1",
      papel: "gestor",
    });
    const alt = atualizarConfiguracoes(db, u.id, { margem_bruta_alvo: "32,5", giro_minimo: 3 });
    expect(alt).toEqual(["margem_bruta_alvo"]);
    const h = listarHistorico(db);
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({
      chave: "margem_bruta_alvo",
      valor_anterior: 35,
      valor_novo: 32.5,
      usuario: "Gestora",
      origem: "edicao",
    });
    expect(h[0]!.changed_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const audit = db.prepare("SELECT * FROM audit_log WHERE acao='alterar'").all();
    expect(audit).toHaveLength(1);
  });
  it("não grava nada se algum valor for inválido", () => {
    const u = criarUsuario(db, {
      username: "gestora",
      nome: "G",
      senha: "senhaforte1",
      papel: "gestor",
    });
    expect(() =>
      atualizarConfiguracoes(db, u.id, { margem_bruta_alvo: 30, cobertura_dias_a: -1 }),
    ).toThrow(ErroValidacao);
    expect(valoresAtuais(db)["margem_bruta_alvo"]).toBe(35);
    expect(listarHistorico(db)).toHaveLength(0);
  });
  it("exporta e importa JSON", () => {
    const u = criarUsuario(db, {
      username: "gestora",
      nome: "G",
      senha: "senhaforte1",
      papel: "gestor",
    });
    const exp = exportarConfiguracoes(db);
    (exp.parametros as Record<string, unknown>)["cobertura_dias_c"] = 28;
    const alt = importarConfiguracoes(db, u.id, JSON.parse(JSON.stringify(exp)));
    expect(alt).toEqual(["cobertura_dias_c"]);
    expect(listarHistorico(db)[0]!.origem).toBe("importacao");
    expect(() => importarConfiguracoes(db, u.id, { formato: "outro" })).toThrow(ErroValidacao);
  });
});

describe("API e RBAC", () => {
  async function login(app: ReturnType<typeof construirApp>, usuario: string, senha: string) {
    const r = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { usuario, senha },
    });
    const c = r.cookies.find((c) => c.name === COOKIE_SESSAO);
    return { r, cookie: c ? { [COOKIE_SESSAO]: c.value } : {} };
  }

  it("fluxo completo Gestor x Operacional", async () => {
    criarUsuario(db, { username: "gestor", nome: "Gestor", senha: "senhaforte1", papel: "gestor" });
    criarUsuario(db, { username: "oper", nome: "Op", senha: "senhaforte2", papel: "operacional" });
    const app = construirApp({ db });

    expect((await app.inject({ url: "/api/configuracoes" })).statusCode).toBe(401);
    expect((await login(app, "gestor", "errada")).r.statusCode).toBe(401);

    const g = await login(app, "gestor", "senhaforte1");
    expect(g.r.statusCode).toBe(200);
    const sc = g.r.cookies.find((c) => c.name === COOKIE_SESSAO)!;
    expect(sc.httpOnly).toBe(true);

    const put = await app.inject({
      method: "PUT",
      url: "/api/configuracoes",
      cookies: g.cookie,
      payload: { alteracoes: { aluguel: "4.500,00" } },
    });
    expect(put.statusCode).toBe(200);
    expect(put.json().alteradas).toEqual(["aluguel"]);

    const bad = await app.inject({
      method: "PUT",
      url: "/api/configuracoes",
      cookies: g.cookie,
      payload: { alteracoes: { margem_bruta_alvo: "abc" } },
    });
    expect(bad.statusCode).toBe(400);

    const o = await login(app, "oper", "senhaforte2");
    expect((await app.inject({ url: "/api/configuracoes", cookies: o.cookie })).statusCode).toBe(
      200,
    );
    expect(
      (await app.inject({ url: "/api/configuracoes/historico", cookies: o.cookie })).json()
        .historico,
    ).toHaveLength(1);
    expect(
      (
        await app.inject({
          method: "PUT",
          url: "/api/configuracoes",
          cookies: o.cookie,
          payload: { alteracoes: { aluguel: 1 } },
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/configuracoes/importar",
          cookies: o.cookie,
          payload: {},
        })
      ).statusCode,
    ).toBe(403);
    expect((await app.inject({ url: "/api/usuarios", cookies: o.cookie })).statusCode).toBe(403);
    expect((await app.inject({ url: "/api/auditoria", cookies: o.cookie })).statusCode).toBe(403);
    expect((await app.inject({ url: "/api/auditoria", cookies: g.cookie })).statusCode).toBe(200);

    const novo = await app.inject({
      method: "POST",
      url: "/api/usuarios",
      cookies: g.cookie,
      payload: { usuario: "op2", nome: "Op 2", senha: "senhaforte3", papel: "operacional" },
    });
    expect(novo.statusCode).toBe(201);

    await app.inject({ method: "POST", url: "/api/auth/logout", cookies: o.cookie });
    expect((await app.inject({ url: "/api/auth/me", cookies: o.cookie })).statusCode).toBe(401);
    await app.close();
  });

  it("sessão expirada é rejeitada", async () => {
    criarUsuario(db, { username: "gestor", nome: "G", senha: "senhaforte1", papel: "gestor" });
    const app = construirApp({ db });
    const g = await login(app, "gestor", "senhaforte1");
    db.prepare("UPDATE sessions SET expires_at = '2000-01-01T00:00:00Z'").run();
    expect((await app.inject({ url: "/api/auth/me", cookies: g.cookie })).statusCode).toBe(401);
    await app.close();
  });
});
