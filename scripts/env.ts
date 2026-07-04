import fs from "node:fs";
import path from "node:path";

/**
 * Carrega variáveis de um arquivo .env.local (se existir) para process.env,
 * sem depender de nenhum pacote externo. Não sobrescreve variáveis já definidas
 * no ambiente. Suporta linhas `CHAVE=valor` e comentários com `#`.
 */
export function loadEnvLocal(cwd = process.cwd()): void {
  const arquivo = path.join(cwd, ".env.local");
  if (!fs.existsSync(arquivo)) return;

  const conteudo = fs.readFileSync(arquivo, "utf8");
  for (const linhaBruta of conteudo.split("\n")) {
    const linha = linhaBruta.trim();
    if (!linha || linha.startsWith("#")) continue;

    const igual = linha.indexOf("=");
    if (igual === -1) continue;

    const chave = linha.slice(0, igual).trim();
    let valor = linha.slice(igual + 1).trim();

    // Remove aspas envolventes, se houver.
    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }

    if (!(chave in process.env)) {
      process.env[chave] = valor;
    }
  }
}
