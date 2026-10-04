import type Database from "better-sqlite3";

export interface Migration {
  id: number;
  nome: string;
  sql: string;
}

// Migrações são somente-adição: nunca altere uma migração já aplicada; crie uma nova.
export const MIGRATIONS: Migration[] = [
  {
    id: 1,
    nome: "base_usuarios_sessoes",
    sql: `
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE COLLATE NOCASE,
        nome TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        papel TEXT NOT NULL CHECK (papel IN ('gestor','operacional')),
        ativo INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );
      CREATE TABLE sessions (
        token_hash TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );
      CREATE INDEX idx_sessions_user ON sessions(user_id);
    `,
  },
  {
    id: 2,
    nome: "configuracoes_historico_auditoria",
    sql: `
      CREATE TABLE settings (
        chave TEXT PRIMARY KEY,
        valor TEXT,
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        updated_by INTEGER REFERENCES users(id)
      );
      CREATE TABLE settings_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chave TEXT NOT NULL,
        valor_anterior TEXT,
        valor_novo TEXT,
        user_id INTEGER REFERENCES users(id),
        origem TEXT NOT NULL DEFAULT 'edicao',
        changed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );
      CREATE INDEX idx_settings_history_chave ON settings_history(chave);
      CREATE TABLE audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        acao TEXT NOT NULL,
        entidade TEXT NOT NULL,
        entidade_id TEXT,
        detalhes TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );
      CREATE INDEX idx_audit_created ON audit_log(created_at);
    `,
  },
];

export function migrate(db: Database.Database): number[] {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`);
  const aplicadas = new Set(
    (db.prepare("SELECT id FROM schema_migrations").all() as { id: number }[]).map((r) => r.id),
  );
  const novas: number[] = [];
  for (const m of MIGRATIONS) {
    if (aplicadas.has(m.id)) continue;
    db.transaction(() => {
      db.exec(m.sql);
      db.prepare("INSERT INTO schema_migrations (id, nome) VALUES (?, ?)").run(m.id, m.nome);
    })();
    novas.push(m.id);
  }
  return novas;
}
