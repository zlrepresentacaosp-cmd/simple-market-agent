import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { api, usuarioAtual } from "@/lib/api";
import { pode, rotuloPapel } from "@/engine/permissions";

export const Route = createFileRoute("/_protegido")({
  ssr: false,
  beforeLoad: async () => {
    const usuario = await usuarioAtual();
    if (!usuario) throw redirect({ to: "/login" });
    return { usuario };
  },
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center px-4 text-center">
      <div>
        <h1 className="text-xl font-semibold">Não foi possível conectar</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      </div>
    </div>
  ),
  component: Layout,
});

function Layout() {
  const { usuario, queryClient } = Route.useRouteContext();
  const navigate = useNavigate();

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    navigate({ to: "/login", replace: true });
  }

  const link = "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground";
  const ativo = { className: "bg-accent text-foreground" };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <span className="font-semibold">Compras Inteligentes</span>
          <nav className="flex gap-1">
            <Link to="/inicio" className={link} activeProps={ativo}>Início</Link>
            <Link to="/configuracoes" className={link} activeProps={ativo}>Configurações</Link>
            {pode(usuario.papel, "usuarios.gerenciar") && (
              <Link to="/usuarios" className={link} activeProps={ativo}>Usuários</Link>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              {usuario.nome} · {rotuloPapel(usuario.papel)}
            </span>
            <Button variant="outline" size="sm" onClick={sair}>Sair</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
