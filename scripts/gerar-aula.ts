import fs from "node:fs";
import path from "node:path";
import { loadEnvLocal } from "./env.js";
import { escanearProjeto } from "./scanner.js";
import { gerarAula } from "./gerarAula.js";

/**
 * CLI do núcleo (Fase 0):
 *   npm run gerar-aula -- <diretorio-do-projeto> [saida.json]
 *
 * Lê um diretório, chama a Claude API e escreve a aula em JSON.
 */

// Caminho que o laboratório (web) lê. Ver lib/aula.ts.
const AULA_ATUAL = path.join("data", "aula.atual.json");

function uso(): never {
  console.error(
    "Uso: npm run gerar-aula -- <diretorio-do-projeto> [saida.json]\n" +
      `Ex.:  npm run gerar-aula -- ../algum-projeto\n` +
      `(por padrão salva em ${AULA_ATUAL}, que o laboratório lê)`
  );
  process.exit(1);
}

async function main() {
  loadEnvLocal();

  const args = process.argv.slice(2);
  if (args.length < 1) uso();

  const dirProjeto = args[0];
  const saida = args[1] ?? AULA_ATUAL;

  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    console.error(
      "❌ Credencial não definida. Defina ANTHROPIC_API_KEY (chave de API) ou ANTHROPIC_AUTH_TOKEN (token OAuth do `claude setup-token`) no .env.local."
    );
    process.exit(1);
  }

  console.log(`📂 Escaneando: ${path.resolve(dirProjeto)}`);
  const resultado = escanearProjeto(dirProjeto);
  console.log(
    `   ${resultado.arquivosIncluidos}/${resultado.totalArquivos} arquivos incluídos ` +
      `(${(resultado.caracteres / 1000).toFixed(1)}k caracteres).`
  );

  if (resultado.arquivosIncluidos === 0) {
    console.error("❌ Nenhum arquivo de texto encontrado no diretório.");
    process.exit(1);
  }

  console.log("🧠 Gerando aula com a Claude API (pode levar alguns segundos)...");
  const aula = await gerarAula(resultado.snapshot);

  const caminhoSaida = path.resolve(saida);
  fs.mkdirSync(path.dirname(caminhoSaida), { recursive: true });
  fs.writeFileSync(caminhoSaida, JSON.stringify(aula, null, 2), "utf8");

  console.log(`✅ Aula gerada: "${aula.titulo}"`);
  console.log(`   ${aula.secoes.length} seções • ${aula.referencias.length} referências`);
  console.log(`   Salva em: ${caminhoSaida}`);
}

main().catch((erro) => {
  console.error("\n❌ Erro:", erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
