// Uso: npm run user:create -- --usuario admin --nome "Fulano" --papel gestor
// A senha é lida de SENHA (variável de ambiente) ou perguntada no terminal (não ecoada).
import { createInterface } from "node:readline";
import { abrirBanco } from "../db";
import { criarUsuario } from "../auth";
import { carregarEnv, config } from "../env";
import { isPapel } from "../../src/engine/permissions";

function arg(nome: string): string | undefined {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function perguntarSenha(): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
  let mascarar = false;
  out._writeToOutput = (s: string) => { out.output.write(mascarar ? "" : s); };
  return new Promise((res) => {
    rl.question("Senha: ", (s) => { rl.close(); process.stdout.write("\n"); res(s); });
    mascarar = true;
  });
}

carregarEnv();
const usuario = arg("usuario");
const nome = arg("nome") ?? usuario;
const papel = arg("papel") ?? "gestor";
if (!usuario || !nome || !isPapel(papel)) {
  console.error('Uso: npm run user:create -- --usuario <login> --nome "<Nome>" --papel gestor|operacional');
  process.exit(1);
}
const senha = process.env["SENHA"] ?? (await perguntarSenha());
const db = abrirBanco(config().dbPath);
try {
  const u = criarUsuario(db, { username: usuario, nome, senha, papel });
  console.log(`Usuário criado: ${u.username} (${u.papel})`);
} catch (e) {
  console.error(`Erro: ${(e as Error).message}`);
  process.exit(1);
}
