import { createFileRoute } from "@tanstack/react-router";
import { rotuloPapel } from "@/engine/permissions";

export const Route = createFileRoute("/_protegido/inicio")({
  head: () => ({
    meta: [
      { title: "Início — Compras Inteligentes" },
      { name: "description", content: "Página inicial do Compras Inteligentes." },
      { property: "og:title", content: "Início — Compras Inteligentes" },
      { property: "og:description", content: "Página inicial do Compras Inteligentes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Inicio,
});

function Inicio() {
  const { usuario } = Route.useRouteContext();
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Olá, {usuario.nome}</h1>
      <p className="text-muted-foreground">
        Você está conectado como {rotuloPapel(usuario.papel)}. Fase 1 (Base): Configurações e usuários disponíveis.
        Os demais módulos chegam nas próximas fases.
      </p>
    </div>
  );
}
