import type { DB } from "./db";

export function registrarAuditoria(
  db: DB,
  userId: number | null,
  acao: string,
  entidade: string,
  entidadeId: string | null,
  detalhes: unknown,
): void {
  db.prepare(
    "INSERT INTO audit_log (user_id, acao, entidade, entidade_id, detalhes) VALUES (?, ?, ?, ?, ?)",
  ).run(userId, acao, entidade, entidadeId, detalhes == null ? null : JSON.stringify(detalhes));
}

export interface EntradaAuditoria {
  id: number;
  usuario: string | null;
  acao: string;
  entidade: string;
  entidade_id: string | null;
  detalhes: unknown;
  created_at: string;
}

export function listarAuditoria(db: DB, limite = 200): EntradaAuditoria[] {
  const rows = db
    .prepare(
      `SELECT a.*, u.nome AS usuario FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
       ORDER BY a.id DESC LIMIT ?`,
    )
    .all(limite) as (Omit<EntradaAuditoria, "detalhes"> & { detalhes: string | null })[];
  return rows.map((r) => ({ ...r, detalhes: r.detalhes ? JSON.parse(r.detalhes) : null }));
}
