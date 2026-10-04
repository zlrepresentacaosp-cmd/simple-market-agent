import { existsSync } from "node:fs";

export function carregarEnv(): void {
  if (existsSync(".env") && typeof process.loadEnvFile === "function") process.loadEnvFile(".env");
}

export function config() {
  return {
    porta: Number(process.env["PORT"] ?? 3333),
    host: process.env["HOST"] ?? "127.0.0.1",
    dbPath: process.env["DB_PATH"] ?? "./data/compras.db",
    sessaoHoras: Number(process.env["SESSION_TTL_HOURS"] ?? 12),
    cookieSeguro: process.env["COOKIE_SECURE"] === "true",
  };
}
