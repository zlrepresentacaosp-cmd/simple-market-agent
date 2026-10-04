export type Papel = "gestor" | "operacional";

export const PAPEIS: { chave: Papel; rotulo: string }[] = [
  { chave: "gestor", rotulo: "Gestor" },
  { chave: "operacional", rotulo: "Operacional" },
];

export type Permissao =
  | "configuracoes.ver"
  | "configuracoes.editar"
  | "usuarios.gerenciar"
  | "auditoria.ver"
  | "estoque.contar"
  | "precos.revisar";

const OPERACIONAL: Permissao[] = ["configuracoes.ver", "estoque.contar", "precos.revisar"];
const GESTOR: Permissao[] = [
  ...OPERACIONAL,
  "configuracoes.editar",
  "usuarios.gerenciar",
  "auditoria.ver",
];

const MAPA: Record<Papel, ReadonlySet<Permissao>> = {
  gestor: new Set(GESTOR),
  operacional: new Set(OPERACIONAL),
};

export function isPapel(v: unknown): v is Papel {
  return v === "gestor" || v === "operacional";
}

export function pode(papel: Papel, permissao: Permissao): boolean {
  return MAPA[papel]?.has(permissao) ?? false;
}

export function rotuloPapel(papel: Papel): string {
  return papel === "gestor" ? "Gestor" : "Operacional";
}
