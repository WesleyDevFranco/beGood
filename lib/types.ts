import { z } from "zod/v4";

/**
 * Modelo de dados da "Aula" (aula.json) — o contrato entre o núcleo (CLI) e o
 * frontend do laboratório. Ver ARQUITETURA.md §3.
 *
 * Uma Seção é um "capítulo" composto por uma sequência ORDENADA de blocos.
 * Cada bloco é teoria (markdown) OU um exercício. Isso permite intercalar
 * "aprende um pouco → pratica → aprende mais", com vários exercícios por seção
 * (modelo "caderno/notebook").
 *
 * Os schemas Zod servem para três coisas ao mesmo tempo:
 *  - gerar o JSON Schema enviado à Claude API (structured outputs);
 *  - validar a resposta da IA em runtime;
 *  - inferir os tipos TypeScript.
 */

export const ReferenciaSchema = z.object({
  titulo: z.string(),
  tipo: z.enum(["artigo", "video", "documentacao"]),
  url: z.string().nullable(),
  porque: z.string(),
});

export const ExercicioSchema = z.object({
  enunciado: z.string(),
  codigoInicial: z.string(),
  linguagem: z.string(),
  // ATENÇÃO: nunca enviar `solucaoReferencia` ao browser antes da 3ª tentativa.
  // A regra vive no backend (ARQUITETURA.md §5).
  solucaoReferencia: z.string(),
  criteriosAvaliacao: z.array(z.string()),
});

/** Bloco de teoria: um pedaço digestível de explicação em markdown. */
export const BlocoTeoriaSchema = z.object({
  tipo: z.literal("teoria"),
  id: z.string(),
  conteudo: z.string(),
});

/** Bloco de exercício: um exercício de reescrita de código. */
export const BlocoExercicioSchema = z.object({
  tipo: z.literal("exercicio"),
  id: z.string(),
  exercicio: ExercicioSchema,
});

/** Um bloco é teoria OU exercício (discriminado por `tipo`). */
export const BlocoSchema = z.discriminatedUnion("tipo", [
  BlocoTeoriaSchema,
  BlocoExercicioSchema,
]);

export const SecaoSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  blocos: z.array(BlocoSchema),
});

export const AulaSchema = z.object({
  titulo: z.string(),
  projetoResumo: z.string(),
  temas: z.array(z.string()),
  secoes: z.array(SecaoSchema),
  referencias: z.array(ReferenciaSchema),
});

export type Referencia = z.infer<typeof ReferenciaSchema>;
export type Exercicio = z.infer<typeof ExercicioSchema>;
export type BlocoTeoria = z.infer<typeof BlocoTeoriaSchema>;
export type BlocoExercicio = z.infer<typeof BlocoExercicioSchema>;
export type Bloco = z.infer<typeof BlocoSchema>;
export type Secao = z.infer<typeof SecaoSchema>;
export type Aula = z.infer<typeof AulaSchema>;

/* ------------------------------------------------------------------ *
 * Versão PÚBLICA da aula — sem `solucaoReferencia`.                    *
 * É o que vai para o navegador. A solução nunca sai do servidor;      *
 * ela só é revelada pela rota /api/revisar após 3 tentativas.         *
 * ------------------------------------------------------------------ */

export type ExercicioPublico = Omit<Exercicio, "solucaoReferencia">;

export type BlocoPublico =
  | BlocoTeoria
  | { tipo: "exercicio"; id: string; exercicio: ExercicioPublico };

export interface SecaoPublica {
  id: string;
  titulo: string;
  blocos: BlocoPublico[];
}

export interface AulaPublica {
  titulo: string;
  projetoResumo: string;
  temas: string[];
  secoes: SecaoPublica[];
  referencias: Referencia[];
}

/* ------------------------------------------------------------------ *
 * Revisão de código                                                   *
 * ------------------------------------------------------------------ */

/** Avaliação crua da IA (structured output) sobre o código do aluno. */
export const AvaliacaoSchema = z.object({
  acertou: z.boolean(),
  dicas: z.array(z.string()),
  resumo: z.string(),
});
export type Avaliacao = z.infer<typeof AvaliacaoSchema>;

/** Resposta da rota /api/revisar para o cliente (já com a regra dos 3 erros). */
export interface Revisao {
  acertou: boolean;
  /** true quando o aluno pode avançar (acertou OU a solução foi revelada). */
  concluido: boolean;
  tentativa: number;
  dicas: string[];
  /** Preenchido apenas quando a solução é revelada (após 3 tentativas). */
  respostaFinal: string | null;
  resumo: string | null;
}
