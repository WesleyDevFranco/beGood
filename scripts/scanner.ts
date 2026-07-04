import fs from "node:fs";
import path from "node:path";

/**
 * Varre um diretório de projeto e monta um "snapshot" em texto (árvore de
 * arquivos + conteúdos) para enviar à Claude API. Ignora dependências, binários
 * e arquivos grandes, e respeita um orçamento total de caracteres para não
 * estourar contexto/custo.
 */

const DIRS_IGNORADOS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "out",
  "coverage",
  ".cache",
  ".turbo",
  "vendor",
  "__pycache__",
  ".venv",
  "venv",
  ".idea",
  ".vscode",
]);

const ARQUIVOS_IGNORADOS = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "composer.lock",
  "poetry.lock",
  ".ds_store",
]);

// Extensões cujo conteúdo não faz sentido enviar (binários, mídia, etc.).
const EXTENSOES_IGNORADAS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".bmp",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".mp3", ".mp4", ".mov", ".avi", ".webm", ".wav",
  ".zip", ".tar", ".gz", ".rar", ".7z",
  ".pdf", ".exe", ".dll", ".so", ".dylib", ".bin",
  ".lock", ".map",
]);

export interface OpcoesScanner {
  /** Tamanho máximo (em caracteres) do conteúdo de UM arquivo. Acima disso, trunca. */
  maxCharsPorArquivo?: number;
  /** Orçamento total de caracteres para os conteúdos somados. */
  maxCharsTotal?: number;
}

export interface ResultadoScanner {
  snapshot: string;
  totalArquivos: number;
  arquivosIncluidos: number;
  caracteres: number;
}

interface ArquivoLido {
  caminhoRelativo: string;
  conteudo: string;
  truncado: boolean;
}

function ehArquivoDeTexto(nome: string): boolean {
  if (ARQUIVOS_IGNORADOS.has(nome.toLowerCase())) return false;
  const ext = path.extname(nome).toLowerCase();
  if (EXTENSOES_IGNORADAS.has(ext)) return false;
  if (nome.endsWith(".min.js") || nome.endsWith(".min.css")) return false;
  return true;
}

function linguagemPorExtensao(nome: string): string {
  const ext = path.extname(nome).toLowerCase();
  const mapa: Record<string, string> = {
    ".ts": "typescript", ".tsx": "tsx", ".js": "javascript", ".jsx": "jsx",
    ".py": "python", ".rb": "ruby", ".go": "go", ".rs": "rust",
    ".java": "java", ".kt": "kotlin", ".php": "php", ".cs": "csharp",
    ".c": "c", ".h": "c", ".cpp": "cpp", ".css": "css", ".scss": "scss",
    ".html": "html", ".json": "json", ".yml": "yaml", ".yaml": "yaml",
    ".md": "markdown", ".sql": "sql", ".sh": "bash",
  };
  return mapa[ext] ?? "";
}

/** Percorre o diretório recursivamente e devolve os caminhos relativos de todos os arquivos de texto. */
function listarArquivos(raiz: string): string[] {
  const encontrados: string[] = [];

  function andar(dirAtual: string) {
    let entradas: fs.Dirent[];
    try {
      entradas = fs.readdirSync(dirAtual, { withFileTypes: true });
    } catch {
      return; // sem permissão / não legível
    }

    for (const entrada of entradas) {
      const nome = entrada.name;
      const caminhoAbs = path.join(dirAtual, nome);

      if (entrada.isDirectory()) {
        if (DIRS_IGNORADOS.has(nome) || nome.startsWith(".")) continue;
        andar(caminhoAbs);
      } else if (entrada.isFile()) {
        // Pula arquivos ocultos (.env, .env.local, etc.) para não vazar segredos.
        if (nome.startsWith(".")) continue;
        if (ehArquivoDeTexto(nome)) {
          encontrados.push(path.relative(raiz, caminhoAbs));
        }
      }
    }
  }

  andar(raiz);
  return encontrados.sort();
}

function montarArvore(caminhos: string[]): string {
  return caminhos.map((c) => `- ${c}`).join("\n");
}

/**
 * Gera o snapshot textual do projeto no caminho dado.
 * Lança erro se o caminho não existir ou não for um diretório.
 */
export function escanearProjeto(
  caminhoProjeto: string,
  opcoes: OpcoesScanner = {}
): ResultadoScanner {
  const maxCharsPorArquivo = opcoes.maxCharsPorArquivo ?? 30_000;
  const maxCharsTotal = opcoes.maxCharsTotal ?? 200_000;

  const raiz = path.resolve(caminhoProjeto);
  const stat = fs.statSync(raiz); // lança se não existir
  if (!stat.isDirectory()) {
    throw new Error(`O caminho não é um diretório: ${raiz}`);
  }

  const caminhos = listarArquivos(raiz);
  const arquivos: ArquivoLido[] = [];
  let orcamento = maxCharsTotal;

  for (const rel of caminhos) {
    if (orcamento <= 0) break;
    let conteudo: string;
    try {
      conteudo = fs.readFileSync(path.join(raiz, rel), "utf8");
    } catch {
      continue;
    }

    let truncado = false;
    if (conteudo.length > maxCharsPorArquivo) {
      conteudo = conteudo.slice(0, maxCharsPorArquivo);
      truncado = true;
    }
    if (conteudo.length > orcamento) {
      conteudo = conteudo.slice(0, orcamento);
      truncado = true;
    }

    orcamento -= conteudo.length;
    arquivos.push({ caminhoRelativo: rel, conteudo, truncado });
  }

  const partes: string[] = [];
  partes.push("# Estrutura do projeto\n");
  partes.push(montarArvore(caminhos));
  partes.push("\n\n# Conteúdo dos arquivos\n");

  for (const arq of arquivos) {
    const lang = linguagemPorExtensao(arq.caminhoRelativo);
    partes.push(`\n## ${arq.caminhoRelativo}${arq.truncado ? " (truncado)" : ""}\n`);
    partes.push("```" + lang + "\n" + arq.conteudo + "\n```\n");
  }

  const snapshot = partes.join("");

  return {
    snapshot,
    totalArquivos: caminhos.length,
    arquivosIncluidos: arquivos.length,
    caracteres: snapshot.length,
  };
}
