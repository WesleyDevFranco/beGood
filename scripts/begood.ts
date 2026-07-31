import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { loadEnvLocal } from "./env.js";
import { escanearProjeto } from "./scanner.js";
import { gerarAula } from "./gerarAula.js";

/**
 * Comando único (fluxo local):
 *   npm run begood -- <diretorio-do-projeto>
 *
 * Escaneia o projeto, gera a aula, sobe o laboratório (Next dev) e abre o
 * navegador. É o jeito de estudar qualquer projeto seu num passo só.
 */

const PORTA = Number(process.env.PORT ?? 3000);
const AULA_ATUAL = path.resolve("data", "aula.atual.json");

function uso(): never {
  console.error(
    "Uso: npm run begood -- <diretorio-do-projeto>\n" +
      "Ex.:  npm run begood -- ../meu-projeto"
  );
  process.exit(1);
}

/** Espera o servidor responder (ou desiste após o timeout). */
async function esperarServidor(url: string, timeoutMs = 60_000): Promise<boolean> {
  const inicio = Date.now();
  while (Date.now() - inicio < timeoutMs) {
    try {
      const res = await fetch(url);
      // qualquer resposta HTTP (mesmo 404) significa que o servidor subiu
      if (res.status < 500) return true;
    } catch {
      // ainda subindo — tenta de novo
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

/** Abre a URL no navegador padrão do sistema (best-effort). */
function abrirNavegador(url: string): void {
  const [cmd, args]: [string, string[]] =
    process.platform === "darwin"
      ? ["open", [url]]
      : process.platform === "win32"
        ? ["cmd", ["/c", "start", "", url]]
        : ["xdg-open", [url]];
  try {
    const p = spawn(cmd, args, { stdio: "ignore", detached: true });
    p.on("error", () => {});
    p.unref();
  } catch {
    // sem navegador disponível — segue o baile
  }
}

async function main() {
  loadEnvLocal();

  const dirProjeto = process.argv[2];
  if (!dirProjeto) uso();

  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    console.error(
      "❌ Credencial não definida. Defina ANTHROPIC_API_KEY (chave de API) ou ANTHROPIC_AUTH_TOKEN (token OAuth do `claude setup-token`) no .env.local."
    );
    process.exit(1);
  }

  // 1. Escanear + gerar a aula
  console.log(`📂 Escaneando: ${path.resolve(dirProjeto)}`);
  const resultado = escanearProjeto(dirProjeto);
  console.log(
    `   ${resultado.arquivosIncluidos}/${resultado.totalArquivos} arquivos ` +
      `(${(resultado.caracteres / 1000).toFixed(1)}k caracteres).`
  );
  if (resultado.arquivosIncluidos === 0) {
    console.error("❌ Nenhum arquivo de texto encontrado no diretório.");
    process.exit(1);
  }

  console.log("🧠 Gerando aula com a Claude API (pode levar alguns segundos)...");
  const aula = await gerarAula(resultado.snapshot);
  fs.mkdirSync(path.dirname(AULA_ATUAL), { recursive: true });
  fs.writeFileSync(AULA_ATUAL, JSON.stringify(aula, null, 2), "utf8");
  console.log(
    `✅ Aula gerada: "${aula.titulo}" — ${aula.secoes.length} seções.`
  );

  // 2. Subir o servidor Next (dev)
  console.log(`🚀 Subindo o laboratório em http://localhost:${PORTA} ...`);
  const nextBin = path.resolve(
    "node_modules",
    ".bin",
    process.platform === "win32" ? "next.cmd" : "next"
  );
  const servidor = spawn(nextBin, ["dev", "-p", String(PORTA)], {
    stdio: "inherit",
    env: process.env,
  });

  const encerrar = () => {
    servidor.kill("SIGINT");
    process.exit(0);
  };
  process.on("SIGINT", encerrar);
  process.on("SIGTERM", encerrar);
  servidor.on("exit", (code) => process.exit(code ?? 0));

  // 3. Esperar o servidor e abrir o navegador
  const url = `http://localhost:${PORTA}/laboratorio`;
  const pronto = await esperarServidor(`http://localhost:${PORTA}`);
  if (pronto) {
    console.log(`🌐 Abrindo ${url}`);
    abrirNavegador(url);
  } else {
    console.log(`⚠️  O servidor demorou. Abra manualmente: ${url}`);
  }
}

main().catch((erro) => {
  console.error("\n❌ Erro:", erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
