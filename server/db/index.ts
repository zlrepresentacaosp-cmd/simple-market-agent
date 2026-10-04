import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { migrate } from "./migrations";
import { semearConfiguracoes } from "../settings";

export type DB = Database.Database;

/** Abre (ou cria) o banco SQLite, aplica migrações e semeia parâmetros faltantes. */
export function abrirBanco(caminho: string): DB {
  if (caminho !== ":memory:") mkdirSync(dirname(caminho), { recursive: true });
  const db = new Database(caminho);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  semearConfiguracoes(db);
  return db;
}
