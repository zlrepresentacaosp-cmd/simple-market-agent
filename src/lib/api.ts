import type { Papel } from "@/engine/permissions";

export interface UsuarioAPI {
  id: number;
  username: string;
  nome: string;
  papel: Papel;
  ativo: boolean;
}

export class ErroAPI extends Error {
  constructor(public status: number, message: string, public erros?: string[]) {
    super(message);
  }
}

export async function api<T>(caminho: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  let res: Response;
  try {
    res = await fetch(caminho, {
      credentials: "same-origin",
      ...rest,
      headers: json !== undefined ? { "content-type": "application/json" } : (rest.headers ?? {}),
      body: json !== undefined ? JSON.stringify(json) : (rest.body ?? null),
    });
  } catch {
    throw new ErroAPI(0, "Servidor local indisponível. Inicie com: npm run dev:server");
  }
  const tipo = res.headers.get("content-type") ?? "";
  const corpo = tipo.includes("application/json") ? await res.json() : null;
  if (!res.ok || corpo === null) {
    const msg = corpo?.erro ?? (res.ok || res.status === 404 ? "Servidor local indisponível. Inicie com: npm run dev:server" : `Erro ${res.status}`);
    throw new ErroAPI(corpo ? res.status : 0, msg, corpo?.erros);
  }
  return corpo as T;
}

export async function usuarioAtual(): Promise<UsuarioAPI | null> {
  try {
    return (await api<{ usuario: UsuarioAPI }>("/api/auth/me")).usuario;
  } catch (e) {
    if (e instanceof ErroAPI && e.status === 401) return null;
    throw e;
  }
}
