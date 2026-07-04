import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { AulaSchema, type Aula } from "../lib/types.js";

const MODELO_PADRAO = "claude-opus-4-8";

const SYSTEM_PROMPT = `Você é um instrutor de programação sênior, especialista em transformar
projetos reais em aulas práticas para desenvolvedores JÚNIOR brasileiros.

Você recebe um snapshot de um projeto (árvore de arquivos + conteúdos) e produz
uma AULA estruturada, em português do Brasil, que ensina o júnior a entender e
recriar partes daquele projeto.

Estrutura da aula:
- A aula tem de 3 a 5 seções (capítulos), em ordem crescente de dificuldade.
- Cada seção é uma sequência ORDENADA de blocos. Cada bloco é "teoria" OU "exercicio".
- Intercale no ritmo "aprende um pouco → pratica → aprende mais": comece com um ou
  mais blocos de teoria e então um bloco de exercício; pode haver VÁRIOS exercícios
  por seção, sempre precedidos pela teoria necessária para resolvê-los.
- Todo bloco tem um 'id' curto e único (ex.: "sec1-teoria1", "sec1-exerc1").

Blocos de teoria:
- 'conteudo' em markdown, didático e progressivo, partindo do "porquê" antes do
  "como". Assuma pouco conhecimento prévio, mas não seja condescendente.
- Prefira pedaços digestíveis (não um textão só). Use trechos de código do próprio
  projeto para ilustrar.

Blocos de exercício (campo 'exercicio'):
- 'enunciado' no estilo "com base na nossa aula e no projeto, reescreva tal parte".
- 'codigoInicial': um esqueleto/stub que o aluno completa (com TODOs), nunca a
  solução pronta.
- 'solucaoReferencia': a resposta correta e completa (usada pelo backend para
  revisar; não aparece para o aluno de imediato).
- 'criteriosAvaliacao': pontos objetivos que um revisor checaria no código do aluno
  (ex.: "trata o caso de lista vazia", "usa async/await corretamente").

Referências (ao final da aula):
- Sugira de 3 a 6 referências (artigos, vídeos, documentação) sobre os temas
  abordados, cada uma com um 'porque' explicando o que estudar ali. Use 'url'
  apenas se tiver certeza do link; caso contrário deixe null.

Baseie-se SOMENTE no projeto fornecido. Use a linguagem/stack real do projeto.`;

export interface OpcoesGeracao {
  modelo?: string;
  maxTokens?: number;
}

/**
 * Envia o snapshot do projeto à Claude API e devolve uma Aula validada.
 * A chave é lida de process.env.ANTHROPIC_API_KEY pelo próprio SDK.
 */
export async function gerarAula(
  snapshotProjeto: string,
  opcoes: OpcoesGeracao = {}
): Promise<Aula> {
  const modelo = opcoes.modelo ?? process.env.BEGOOD_MODEL ?? MODELO_PADRAO;
  const maxTokens = opcoes.maxTokens ?? 16_000;

  const client = new Anthropic();

  const resposta = await client.messages.parse({
    model: modelo,
    max_tokens: maxTokens,
    system: SYSTEM_PROMPT,
    output_config: {
      format: zodOutputFormat(AulaSchema),
    },
    messages: [
      {
        role: "user",
        content:
          "Aqui está o snapshot do projeto. Gere a aula estruturada seguindo as regras.\n\n" +
          snapshotProjeto,
      },
    ],
  });

  if (resposta.stop_reason === "refusal") {
    throw new Error(
      "A IA recusou a solicitação por motivos de segurança. Verifique o conteúdo do projeto."
    );
  }

  if (resposta.stop_reason === "max_tokens") {
    throw new Error(
      "A resposta foi truncada (max_tokens). Tente aumentar maxTokens ou reduzir o projeto."
    );
  }

  const aula = resposta.parsed_output;
  if (!aula) {
    throw new Error("A IA não devolveu uma aula no formato esperado.");
  }

  return aula;
}
