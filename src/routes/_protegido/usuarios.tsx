import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, type UsuarioAPI } from "@/lib/api";
import { PAPEIS, pode, rotuloPapel, type Papel } from "@/engine/permissions";

export const Route = createFileRoute("/_protegido/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários — Compras Inteligentes" },
      { name: "description", content: "Gestão de usuários e papéis." },
      { property: "og:title", content: "Usuários — Compras Inteligentes" },
      { property: "og:description", content: "Gestão de usuários e papéis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: ({ context }) => {
    if (!pode(context.usuario.papel, "usuarios.gerenciar")) throw redirect({ to: "/inicio" });
  },
  component: Usuarios,
});

function Usuarios() {
  const qc = useQueryClient();
  const lista = useQuery({ queryKey: ["usuarios"], queryFn: () => api<{ usuarios: UsuarioAPI[] }>("/api/usuarios") });
  const [form, setForm] = useState({ usuario: "", nome: "", senha: "", papel: "operacional" as Papel });
  const [erro, setErro] = useState<string | null>(null);
  const criar = useMutation({
    mutationFn: () => api("/api/usuarios", { method: "POST", json: form }),
    onSuccess: () => {
      setForm({ usuario: "", nome: "", senha: "", papel: "operacional" });
      setErro(null);
      qc.invalidateQueries({ queryKey: ["usuarios"] });
    },
    onError: (e) => setErro((e as Error).message),
  });

  function enviar(e: FormEvent) {
    e.preventDefault();
    criar.mutate();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Usuários</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Novo usuário</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-5 sm:items-end">
            <div className="space-y-2"><Label htmlFor="u">Usuário</Label><Input id="u" value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value })} required /></div>
            <div className="space-y-2"><Label htmlFor="n">Nome</Label><Input id="n" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
            <div className="space-y-2"><Label htmlFor="s">Senha (mín. 8)</Label><Input id="s" type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} required /></div>
            <div className="space-y-2">
              <Label htmlFor="p">Papel</Label>
              <select id="p" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.papel} onChange={(e) => setForm({ ...form, papel: e.target.value as Papel })}>
                {PAPEIS.map((p) => <option key={p.chave} value={p.chave}>{p.rotulo}</option>)}
              </select>
            </div>
            <Button type="submit" disabled={criar.isPending}>Criar</Button>
          </form>
          {erro && <p className="mt-3 text-sm text-destructive">{erro}</p>}
        </CardContent>
      </Card>
      {lista.error && <p className="text-sm text-destructive">{(lista.error as Error).message}</p>}
      <Table>
        <TableHeader><TableRow><TableHead>Usuário</TableHead><TableHead>Nome</TableHead><TableHead>Papel</TableHead><TableHead>Situação</TableHead></TableRow></TableHeader>
        <TableBody>
          {lista.data?.usuarios.map((u) => (
            <TableRow key={u.id}>
              <TableCell>{u.username}</TableCell><TableCell>{u.nome}</TableCell>
              <TableCell>{rotuloPapel(u.papel)}</TableCell><TableCell>{u.ativo ? "Ativo" : "Inativo"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
