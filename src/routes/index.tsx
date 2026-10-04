import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Compras Inteligentes" },
      { name: "description", content: "Compras Inteligentes — gestão de compras do mercado." },
      { property: "og:title", content: "Compras Inteligentes" },
      {
        property: "og:description",
        content: "Compras Inteligentes — gestão de compras do mercado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/inicio" });
  },
});
