import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { GRUPOS, PARAMETROS, getParamDef, type ParamDef } from "@/engine/parameters";
import { pode } from "@/engine/permissions";
import { formatarDataHora, formatarMoeda, formatarNumero, formatarPercentual } from "@/engine/format";

export const Route = createFileRoute("/_protegido/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Compras Inteligentes" },
      { name: "description", content: "Parâmetros de negócio e histórico de alterações." },
      { property: "og:title", content: "Configurações — Compras Inteligentes" },
      { property: "og:description", content: "Parâmetros de negócio e histórico de alterações." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Configuracoes,
});

interface Config { chave: string; valor: unknown; updated_at: string; updated_by: string | null }
interface Hist { id: number; chave: string; rotulo: string; valor_anterior: unknown; valor_novo: unknown; usuario: string | null; origem: string; changed_at: string }

type Linha = Record<string, string>;
type Rascunho = Record<string, string | Linha[]>;

function paraRascunho(def: ParamDef, v: unknown): string | Linha[] {
  if (def.tipo === "lista") {
    return Array.isArray(v) ? v.map((l) => Object.fromEntries(Object.entries(l as object).map(([k, x]) => [k, String(x)]))) : [];
  }
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return String(v).replace(".", ",");
  return String(v);
}

function exibir(chave: string, v: unknown): string {
  const def = getParamDef(chave);
  if (v === null || v === undefined || (Array.isArray(v) && v.length === 0)) return "—";
  if (!def) return JSON.stringify(v);
  if (typeof v === "number") {
    if (def.tipo === "moeda") return formatarMoeda(v);
    if (def.tipo === "percentual") return formatarPercentual(v);
    return `${formatarNumero(v)}${def.unidade ? ` ${def.unidade}` : ""}`;
  }
  if (Array.isArray(v)) return `${v.length} item(ns)`;
  return String(v);
}

function Configuracoes() {
  const { usuario } = Route.useRouteContext();
  const podeEditar = pode(usuario.papel, "configuracoes.editar");
  const qc = useQueryClient();
  const cfg = useQuery({ queryKey: ["configuracoes"], queryFn: () => api<{ configuracoes: Config[] }>("/api/configuracoes") });
  const hist = useQuery({ queryKey: ["historico"], queryFn: () => api<{ historico: Hist[] }>("/api/configuracoes/historico") });

  const original = useMemo<Rascunho>(() => {
    const r: Rascunho = {};
    for (const c of cfg.data?.configuracoes ?? []) {
      const def = getParamDef(c.chave);
      if (def) r[c.chave] = paraRascunho(def, c.valor);
    }
    return r;
  }, [cfg.data]);
  const [rascunho, setRascunho] = useState<Rascunho>({});
  useEffect(() => setRascunho(original), [original]);

  const alteradas = Object.keys(rascunho).filter((k) => JSON.stringify(rascunho[k]) !== JSON.stringify(original[k]));
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const aposSalvar = (r: { alteradas: string[] }) => {
    setMsg({ tipo: "ok", texto: r.alteradas.length ? `${r.alteradas.length} parâmetro(s) atualizado(s).` : "Nenhuma alteração." });
    qc.invalidateQueries({ queryKey: ["configuracoes"] });
    qc.invalidateQueries({ queryKey: ["historico"] });
  };
  const erro = (e: unknown) => {
    const err = e as Error & { erros?: string[] };
    setMsg({ tipo: "erro", texto: err.erros?.join(" ") ?? err.message });
  };

  const salvar = useMutation({
    mutationFn: () => api<{ alteradas: string[] }>("/api/configuracoes", {
      method: "PUT",
      json: { alteracoes: Object.fromEntries(alteradas.map((k) => [k, rascunho[k]])) },
    }),
    onSuccess: aposSalvar,
    onError: erro,
  });

  const importar = useMutation({
    mutationFn: (json: unknown) => api<{ alteradas: string[] }>("/api/configuracoes/importar", { method: "POST", json }),
    onSuccess: aposSalvar,
    onError: erro,
  });
  const arquivo = useRef<HTMLInputElement>(null);

  async function aoEscolherArquivo(f: File | undefined) {
    if (!f) return;
    try {
      importar.mutate(JSON.parse(await f.text()));
    } catch {
      setMsg({ tipo: "erro", texto: "Arquivo JSON inválido." });
    }
    if (arquivo.current) arquivo.current.value = "";
  }

  if (cfg.error) return <p className="text-destructive">{(cfg.error as Error).message}</p>;
  if (!cfg.data) return <p className="text-muted-foreground">Carregando...</p>;

  const meta = new Map(cfg.data.configuracoes.map((c) => [c.chave, c]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Configurações</h1>
        {!podeEditar && <Badge variant="secondary">Somente leitura</Badge>}
        <div className="ml-auto flex gap-2">
          <Button variant="outline" asChild><a href="/api/configuracoes/exportar" download="configuracoes.json">Exportar JSON</a></Button>
          {podeEditar && (
            <>
              <input ref={arquivo} type="file" accept="application/json,.json" className="hidden" onChange={(e) => aoEscolherArquivo(e.target.files?.[0])} />
              <Button variant="outline" onClick={() => arquivo.current?.click()} disabled={importar.isPending}>Importar JSON</Button>
            </>
          )}
        </div>
      </div>

      {msg && <p className={msg.tipo === "ok" ? "text-sm text-primary" : "text-sm text-destructive"} role="status">{msg.texto}</p>}

      {GRUPOS.map((g) => (
        <Card key={g.chave}>
          <CardHeader><CardTitle className="text-base">{g.rotulo}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {PARAMETROS.filter((p) => p.grupo === g.chave).map((def) => (
              <Campo
                key={def.chave}
                def={def}
                valor={rascunho[def.chave] ?? (def.tipo === "lista" ? [] : "")}
                alterado={alteradas.includes(def.chave)}
                desabilitado={!podeEditar}
                atualizadoEm={meta.get(def.chave)?.updated_by ? `${meta.get(def.chave)!.updated_by}, ${formatarDataHora(meta.get(def.chave)!.updated_at)}` : null}
                onChange={(v) => setRascunho((r) => ({ ...r, [def.chave]: v }))}
              />
            ))}
          </CardContent>
        </Card>
      ))}

      {podeEditar && (
        <div className="sticky bottom-4 flex justify-end gap-2">
          <Button variant="outline" disabled={!alteradas.length} onClick={() => { setRascunho(original); setMsg(null); }}>Descartar</Button>
          <Button disabled={!alteradas.length || salvar.isPending} onClick={() => salvar.mutate()}>
            Salvar {alteradas.length ? `(${alteradas.length})` : ""}
          </Button>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Histórico de alterações</CardTitle></CardHeader>
        <CardContent>
          {hist.data?.historico.length ? (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Data</TableHead><TableHead>Usuário</TableHead><TableHead>Parâmetro</TableHead>
                <TableHead>Antes</TableHead><TableHead>Depois</TableHead><TableHead>Origem</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {hist.data.historico.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="whitespace-nowrap">{formatarDataHora(h.changed_at)}</TableCell>
                    <TableCell>{h.usuario ?? "—"}</TableCell>
                    <TableCell>{h.rotulo}</TableCell>
                    <TableCell>{exibir(h.chave, h.valor_anterior)}</TableCell>
                    <TableCell>{exibir(h.chave, h.valor_novo)}</TableCell>
                    <TableCell>{h.origem === "importacao" ? "Importação" : "Edição"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma alteração registrada.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Campo(props: {
  def: ParamDef;
  valor: string | Linha[];
  alterado: boolean;
  desabilitado: boolean;
  atualizadoEm: string | null;
  onChange: (v: string | Linha[]) => void;
}) {
  const { def, valor, desabilitado, onChange } = props;
  const sufixo = def.tipo === "moeda" ? "R$" : def.tipo === "percentual" ? "%" : def.unidade;
  const cabecalho = (
    <div className="flex flex-wrap items-center gap-2">
      <Label htmlFor={def.chave}>{def.rotulo}</Label>
      {def.preencher && <Badge variant="outline">[PREENCHER]</Badge>}
      {props.alterado && <Badge>alterado</Badge>}
    </div>
  );
  const rodape = props.atualizadoEm && <p className="text-xs text-muted-foreground">Última alteração: {props.atualizadoEm}</p>;

  if (def.tipo === "lista") {
    const linhas = Array.isArray(valor) ? valor : [];
    const campos = def.campos ?? [];
    const vazia = () => Object.fromEntries(campos.map((c) => [c.chave, ""]));
    return (
      <div className="space-y-2 sm:col-span-2">
        {cabecalho}
        {linhas.length === 0 && <p className="text-sm text-muted-foreground">Nenhum item cadastrado.</p>}
        {linhas.map((l, i) => (
          <div key={i} className="flex flex-wrap gap-2">
            {campos.map((c) => (
              <Input key={c.chave} className="min-w-40 flex-1" placeholder={c.rotulo} aria-label={c.rotulo} value={l[c.chave] ?? ""} disabled={desabilitado}
                onChange={(e) => onChange(linhas.map((x, j) => (j === i ? { ...x, [c.chave]: e.target.value } : x)))} />
            ))}
            {!desabilitado && <Button variant="ghost" size="sm" onClick={() => onChange(linhas.filter((_, j) => j !== i))}>Remover</Button>}
          </div>
        ))}
        {!desabilitado && <Button variant="outline" size="sm" onClick={() => onChange([...linhas, vazia()])}>Adicionar</Button>}
        {rodape}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {cabecalho}
      <div className="flex items-center gap-2">
        <Input
          id={def.chave}
          value={typeof valor === "string" ? valor : ""}
          disabled={desabilitado}
          inputMode={["moeda", "percentual", "inteiro", "decimal"].includes(def.tipo) ? "decimal" : undefined}
          type={def.tipo === "email" ? "email" : "text"}
          placeholder={def.tipo === "horario" ? "HH:MM" : def.preencher ? "Não preenchido" : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        {sufixo && <span className="text-sm text-muted-foreground">{sufixo}</span>}
      </div>
      {rodape}
    </div>
  );
}
