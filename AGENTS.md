<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Pure business rules live in `src/engine/` (no I/O); shared by server and web so validation/permissions have one source.
- Backend is a local Node + Fastify API in `server/` with SQLite (better-sqlite3) — the spec requires a local single-file DB.
- Schema changes are append-only entries in `server/db/migrations.ts`; never edit an applied migration.
- Business parameters are defined in `src/engine/parameters.ts` and persisted in the `settings` table; screens never hardcode business numbers.
- Every settings change goes through `atualizarConfiguracoes` so history and audit are always written in one transaction.
- Authorization is enforced server-side per route via `pode()`; UI checks only hide controls.
- Web calls `/api/*` via same-origin fetch; the Vite dev proxy forwards to Fastify (the Lovable sandbox strips the proxy, so preview cannot reach the API).
- Server tests use `// @vitest-environment node` and in-memory SQLite.
