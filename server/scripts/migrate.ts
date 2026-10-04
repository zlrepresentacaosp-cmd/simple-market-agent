import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { migrate } from "../db/migrations";
import { semearConfiguracoes } from "../settings";
import { carregarEnv, config } from "../env";

carregarEnv();
const { dbPath } = config();
mkdirSync(dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.pragma("foreign_keys = ON");
const novas = migrate(db);
semearConfiguracoes(db);
console.log(novas.length ? `Migrações aplicadas: ${novas.join(", ")}` : "Banco já está atualizado.");
console.log(`Banco: ${dbPath}`);
