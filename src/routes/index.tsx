import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Agente de Compras - Mercado" },
      {
        name: "description",
        content: "Agente de Compras - Mercado. Em construção.",
      },
      { property: "og:title", content: "Agente de Compras - Mercado" },
      {
        property: "og:description",
        content: "Agente de Compras - Mercado. Em construção.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Agente de Compras - Mercado" },
      {
        name: "twitter:description",
        content: "Agente de Compras - Mercado. Em construção.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-foreground">
        Agente de Compras - Mercado
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">Em construção</p>
    </div>
  );
}
