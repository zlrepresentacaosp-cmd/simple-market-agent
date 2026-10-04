import { construirApp } from "./app";
import { abrirBanco } from "./db";
import { carregarEnv, config } from "./env";

carregarEnv();
const cfg = config();
const db = abrirBanco(cfg.dbPath);
const app = construirApp({
  db,
  sessaoHoras: cfg.sessaoHoras,
  cookieSeguro: cfg.cookieSeguro,
  logger: true,
});

app.listen({ port: cfg.porta, host: cfg.host }).catch((e) => {
  console.error(e);
  process.exit(1);
});
