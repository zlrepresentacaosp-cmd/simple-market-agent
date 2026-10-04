import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { DB } from "./db";
import { isPapel, type Papel } from "../src/engine/permissions";
import { registrarAuditoria } from "./audit";

const N = 16384, R = 8, P = 1, KEYLEN = 64;

export function hashSenha(senha: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(senha, salt, KEYLEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verificarSenha(senha: string, armazenado: string): boolean {
  const partes = armazenado.split("$");
  if (partes.length !== 6 || partes[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, hashB64] = partes as [string, string, string, string, string, string];
  const esperado = Buffer.from(hashB64, "base64");
  const calc = scryptSync(senha, Buffer.from(saltB64, "base64"), esperado.length, {
    N: Number(n), r: Number(r), p: Number(p),
  });
  return calc.length === esperado.length && timingSafeEqual(calc, esperado);
}

export interface Usuario {
  id: number;
  username: string;
  nome: string;
  papel: Papel;
  ativo: boolean;
}

interface UserRow {
  id: number; username: string; nome: string; papel: string; ativo: number; password_hash: string;
}

function toUsuario(r: UserRow): Usuario {
  if (!isPapel(r.papel)) throw new Error("Papel inválido no banco");
  return { id: r.id, username: r.username, nome: r.nome, papel: r.papel, ativo: r.ativo === 1 };
}

export const SENHA_MINIMA = 8;

export function criarUsuario(
  db: DB,
  dados: { username: string; nome: string; senha: string; papel: Papel },
  autorId: number | null = null,
): Usuario {
  const username = dados.username.trim();
  if (!/^[a-zA-Z0-9._-]{3,40}$/.test(username)) throw new Error("Usuário deve ter 3–40 caracteres (letras, números, . _ -).");
  if (dados.senha.length < SENHA_MINIMA) throw new Error(`A senha deve ter pelo menos ${SENHA_MINIMA} caracteres.`);
  if (!isPapel(dados.papel)) throw new Error("Papel inválido.");
  if (!dados.nome.trim()) throw new Error("Nome obrigatório.");
  const existe = db.prepare("SELECT 1 FROM users WHERE username = ?").get(username);
  if (existe) throw new Error("Usuário já existe.");
  const info = db
    .prepare("INSERT INTO users (username, nome, password_hash, papel) VALUES (?, ?, ?, ?)")
    .run(username, dados.nome.trim(), hashSenha(dados.senha), dados.papel);
  const id = Number(info.lastInsertRowid);
  registrarAuditoria(db, autorId, "criar", "usuario", String(id), { username, papel: dados.papel });
  return buscarUsuario(db, id)!;
}

export function buscarUsuario(db: DB, id: number): Usuario | null {
  const r = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
  return r ? toUsuario(r) : null;
}

export function listarUsuarios(db: DB): Usuario[] {
  return (db.prepare("SELECT * FROM users ORDER BY nome").all() as UserRow[]).map(toUsuario);
}

export function autenticar(db: DB, username: string, senha: string): Usuario | null {
  const r = db.prepare("SELECT * FROM users WHERE username = ?").get(username.trim()) as UserRow | undefined;
  if (!r || r.ativo !== 1 || !verificarSenha(senha, r.password_hash)) {
    registrarAuditoria(db, r?.id ?? null, "login_falhou", "sessao", null, { username });
    return null;
  }
  return toUsuario(r);
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export function criarSessao(db: DB, userId: number, ttlHoras: number): { token: string; expiresAt: string } {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ttlHoras * 3600_000).toISOString();
  db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(sha256(token), userId, expiresAt);
  registrarAuditoria(db, userId, "login", "sessao", null, null);
  return { token, expiresAt };
}

export function usuarioDaSessao(db: DB, token: string | undefined): Usuario | null {
  if (!token) return null;
  const r = db
    .prepare(
      `SELECT u.*, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`,
    )
    .get(sha256(token)) as (UserRow & { expires_at: string }) | undefined;
  if (!r) return null;
  if (new Date(r.expires_at).getTime() < Date.now() || r.ativo !== 1) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
    return null;
  }
  return toUsuario(r);
}

export function encerrarSessao(db: DB, token: string | undefined): void {
  if (!token) return;
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
}
