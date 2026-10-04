import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import type { DB } from "./db";
import {
  autenticar, criarSessao, criarUsuario, encerrarSessao, listarUsuarios, usuarioDaSessao, type Usuario,
} from "./auth";
import {
  ErroValidacao, atualizarConfiguracoes, exportarConfiguracoes, importarConfiguracoes,
  listarConfiguracoes, listarHistorico,
} from "./settings";
import { listarAuditoria } from "./audit";
import { isPapel, pode, type Permissao } from "../src/engine/permissions";

export const COOKIE_SESSAO = "ci_sessao";

export interface AppOptions {
  db: DB;
  sessaoHoras?: number;
  cookieSeguro?: boolean;
  logger?: boolean;
}

declare module "fastify" {
  interface FastifyRequest {
    usuario: Usuario | null;
  }
}

export function construirApp(opts: AppOptions) {
  const { db } = opts;
  const sessaoHoras = opts.sessaoHoras ?? 12;
  const app = Fastify({ logger: opts.logger ?? false });
  app.register(cookie);
  app.decorateRequest("usuario", null);

  app.addHook("preHandler", async (req) => {
    req.usuario = usuarioDaSessao(db, req.cookies[COOKIE_SESSAO]);
  });

  const exigir = (perm?: Permissao) => async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.usuario) return reply.code(401).send({ erro: "Não autenticado." });
    if (perm && !pode(req.usuario.papel, perm)) return reply.code(403).send({ erro: "Sem permissão." });
  };

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ErroValidacao) return reply.code(400).send({ erro: err.message, erros: err.erros });
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    return reply.code(status).send({ erro: status === 500 ? "Erro interno." : err.message });
  });

  app.get("/api/saude", async () => ({ ok: true }));

  // --- Autenticação ---
  app.post("/api/auth/login", async (req, reply) => {
    const b = (req.body ?? {}) as { usuario?: unknown; senha?: unknown };
    if (typeof b.usuario !== "string" || typeof b.senha !== "string") {
      return reply.code(400).send({ erro: "Informe usuário e senha." });
    }
    const u = autenticar(db, b.usuario, b.senha);
    if (!u) return reply.code(401).send({ erro: "Usuário ou senha inválidos." });
    const s = criarSessao(db, u.id, sessaoHoras);
    reply.setCookie(COOKIE_SESSAO, s.token, {
      httpOnly: true, sameSite: "strict", path: "/", secure: opts.cookieSeguro ?? false,
      expires: new Date(s.expiresAt),
    });
    return { usuario: u };
  });

  app.post("/api/auth/logout", async (req, reply) => {
    encerrarSessao(db, req.cookies[COOKIE_SESSAO]);
    reply.clearCookie(COOKIE_SESSAO, { path: "/" });
    return { ok: true };
  });

  app.get("/api/auth/me", { preHandler: exigir() }, async (req) => ({ usuario: req.usuario }));

  // --- Configurações ---
  app.get("/api/configuracoes", { preHandler: exigir("configuracoes.ver") }, async () => ({
    configuracoes: listarConfiguracoes(db),
  }));

  app.put("/api/configuracoes", { preHandler: exigir("configuracoes.editar") }, async (req, reply) => {
    const b = req.body as { alteracoes?: unknown } | undefined;
    if (!b || typeof b.alteracoes !== "object" || b.alteracoes === null || Array.isArray(b.alteracoes)) {
      return reply.code(400).send({ erro: "Corpo inválido." });
    }
    const alteradas = atualizarConfiguracoes(db, req.usuario!.id, b.alteracoes as Record<string, unknown>);
    return { alteradas, configuracoes: listarConfiguracoes(db) };
  });

  app.get("/api/configuracoes/historico", { preHandler: exigir("configuracoes.ver") }, async (req) => {
    const q = req.query as { chave?: string };
    return { historico: listarHistorico(db, q.chave) };
  });

  app.get("/api/configuracoes/exportar", { preHandler: exigir("configuracoes.ver") }, async (_req, reply) => {
    reply.header("content-disposition", 'attachment; filename="configuracoes.json"');
    return exportarConfiguracoes(db);
  });

  app.post("/api/configuracoes/importar", { preHandler: exigir("configuracoes.editar") }, async (req) => {
    const alteradas = importarConfiguracoes(db, req.usuario!.id, req.body);
    return { alteradas, configuracoes: listarConfiguracoes(db) };
  });

  // --- Usuários e auditoria (somente Gestor) ---
  app.get("/api/usuarios", { preHandler: exigir("usuarios.gerenciar") }, async () => ({ usuarios: listarUsuarios(db) }));

  app.post("/api/usuarios", { preHandler: exigir("usuarios.gerenciar") }, async (req, reply) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const { usuario, nome, senha, papel } = b;
    if (typeof usuario !== "string" || typeof nome !== "string" || typeof senha !== "string" || !isPapel(papel)) {
      return reply.code(400).send({ erro: "Dados inválidos." });
    }
    try {
      const u = criarUsuario(db, { username: usuario, nome, senha, papel }, req.usuario!.id);
      return reply.code(201).send({ usuario: u });
    } catch (e) {
      return reply.code(400).send({ erro: (e as Error).message });
    }
  });

  app.get("/api/auditoria", { preHandler: exigir("auditoria.ver") }, async () => ({ auditoria: listarAuditoria(db) }));

  return app;
}
