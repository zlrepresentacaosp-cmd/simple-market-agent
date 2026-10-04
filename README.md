# Compras Inteligentes — Fase 1 (Base)

Sistema web local em pt-BR (R$ 1.234,56 · dd/mm/aaaa · America/Sao_Paulo).

## Arquitetura

```text
src/engine/   Regras puras (parâmetros, validação, permissões, formatação pt-BR) — sem I/O
server/       API Fastify + SQLite (better-sqlite3), migrações, autenticação, auditoria, scripts
src/routes/   Telas (web) — React + Vite + Tailwind
```

- Banco: arquivo SQLite local (`DB_PATH`, padrão `./data/compras.db`), migrações em `server/db/migrations.ts`, aplicadas automaticamente ao iniciar o servidor.
- Senhas: hash `scrypt` com salt aleatório (nunca em texto). Sessões: token aleatório em cookie `httpOnly`; o banco guarda apenas o SHA-256 do token.
- Papéis: **Gestor** (tudo) e **Operacional** (ver, contar estoque, revisar preços; não altera parâmetros nem usuários). Verificado no servidor em cada rota.
- Configurações: todos os parâmetros ficam no banco; toda alteração grava histórico (parâmetro, antes, depois, usuário, data) e log de auditoria. Exportar/importar JSON.
- Campos **[PREENCHER]** (concorrentes/URLs, regime/alíquota, aluguel, energia, pró-labore, outros custos fixos, encargos, prazos de fornecedores, e-mail de notificações) começam vazios.

## Requisitos

- Node.js 22.12.0 ou superior e npm. O projeto padroniza em npm para manter o runtime alinhado às dependências e usar instalações determinísticas com `package-lock.json`.

## Instalação

```sh
npm ci
cp .env.example .env      # ajuste se necessário
npm run db:migrate        # cria ./data/compras.db e os parâmetros iniciais
```

## Usuário inicial

```sh
npm run user:create -- --usuario admin --nome "Seu Nome" --papel gestor
```

A senha (mínimo 8 caracteres) é pedida no terminal. Para automatizar: `SENHA=... npm run user:create -- ...`.
Depois, outros usuários podem ser criados pelo Gestor na tela **Usuários**.

## Execução local

Em dois terminais:

```sh
npm run dev:server   # API em http://127.0.0.1:3333
npm run dev          # telas em http://localhost:8080 (encaminha /api para a API)
```

Abra http://localhost:8080 e entre com o usuário criado.

> A pré-visualização online do Lovable não executa o servidor local; lá as telas mostram "Servidor local indisponível". Use os comandos acima no seu computador.

## Testes

```sh
npm test
```

Cobrem migrações, parâmetros iniciais e [PREENCHER], validação, hash de senha, login/sessão/expiração, RBAC Gestor x Operacional, histórico antes/depois, auditoria e exportação/importação JSON.

## Variáveis (.env)

| Variável | Padrão | Uso |
| --- | --- | --- |
| PORT | 3333 | Porta da API |
| HOST | 127.0.0.1 | Endereço da API |
| DB_PATH | ./data/compras.db | Arquivo SQLite |
| SESSION_TTL_HOURS | 12 | Validade da sessão |
| COOKIE_SECURE | false | `true` se servido via HTTPS |
| API_URL | http://127.0.0.1:3333 | Destino do encaminhamento /api no `npm run dev` |


## CI e desenvolvimento no GitHub

O CI usa Node.js 22 e executa instalação com `npm ci`, migrações SQLite, ESLint, `tsc --noEmit`, Vitest e build. O workflow `Update npm lockfile` é manual e atualiza apenas o `package-lock.json` na branch `infra-ci-package-manager`.

Para o desenvolvimento local, use Node 22 (o arquivo `.nvmrc` fixa a linha 22).
