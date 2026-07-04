import fs from "node:fs";
import path from "node:path";
import type { Aula, AulaPublica, Exercicio } from "./types";

/**
 * Helpers server-only para a aula. NÃO importar em componentes de cliente —
 * `carregarAula()` devolve a aula COM `solucaoReferencia`, que não pode ir para
 * o navegador. Use `sanitizarAula()` antes de passar dados ao cliente.
 */

const DIR_DADOS = path.join(process.cwd(), "data");
const AULA_ATUAL = path.join(DIR_DADOS, "aula.atual.json");
const AULA_EXEMPLO = path.join(DIR_DADOS, "aula.exemplo.json");

/**
 * Carrega a aula atual (gerada pelo núcleo em `data/aula.atual.json`).
 * Se ainda não houver uma aula gerada, cai na aula de exemplo — assim o
 * laboratório sempre tem algo para mostrar.
 */
export function carregarAula(): Aula {
  const caminho = fs.existsSync(AULA_ATUAL) ? AULA_ATUAL : AULA_EXEMPLO;
  const bruto = fs.readFileSync(caminho, "utf8");
  return JSON.parse(bruto) as Aula;
}

/** Remove `solucaoReferencia` de todos os exercícios (versão pública). */
export function sanitizarAula(aula: Aula): AulaPublica {
  return {
    titulo: aula.titulo,
    projetoResumo: aula.projetoResumo,
    temas: aula.temas,
    referencias: aula.referencias,
    secoes: aula.secoes.map((secao) => ({
      id: secao.id,
      titulo: secao.titulo,
      blocos: secao.blocos.map((bloco) => {
        if (bloco.tipo !== "exercicio") return bloco;
        const { solucaoReferencia: _omitida, ...exercicioPublico } =
          bloco.exercicio;
        return { tipo: "exercicio", id: bloco.id, exercicio: exercicioPublico };
      }),
    })),
  };
}

/** Acha o exercício (com solução) pelo id do bloco. */
export function acharExercicio(aula: Aula, id: string): Exercicio | undefined {
  for (const secao of aula.secoes) {
    for (const bloco of secao.blocos) {
      if (bloco.tipo === "exercicio" && bloco.id === id) {
        return bloco.exercicio;
      }
    }
  }
  return undefined;
}
