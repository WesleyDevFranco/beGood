import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { AvaliacaoSchema, type Revisao } from "@/lib/types";
import { carregarAula, acharExercicio } from "@/lib/aula";

// Precisa do runtime Node (SDK da Anthropic não roda no edge).
export const runtime = "nodejs";

const MODELO_PADRAO = "claude-opus-4-8";

function systemPrompt(): string {
  return `Você é um revisor de código gentil e rigoroso, avaliando o exercício de um
desenvolvedor JÚNIOR. Você recebe: o enunciado, os critérios de avaliação, uma
solução de referência e o código do aluno.

Sua tarefa:
- Decida se o código do aluno satisfaz os critérios (não precisa ser idêntico à
  referência; soluções alternativas corretas contam como acerto).
- Se satisfaz todos os critérios essenciais, defina "acertou": true.
- Se NÃO satisfaz, defina "acertou": false e escreva de 1 a 2 dicas curtas em
  português que apontem o que está faltando ou errado — SEM entregar a solução
  pronta nem colar trechos da referência. Foque em orientar o raciocínio.
- "resumo": uma frase curta e amigável sobre o resultado.
- Nunca revele a solução de referência ao aluno.`;
}

function userPrompt(
  exercicio: NonNullable<ReturnType<typeof acharExercicio>>,
  codigo: string
): string {
  const criterios = exercicio.criteriosAvaliacao
    .map((c, i) => `${i + 1}. ${c}`)
    .join("\n");
  return [
    `Enunciado:\n${exercicio.enunciado}`,
    `Critérios de avaliação:\n${criterios}`,
    `Solução de referência (uso interno, NÃO revelar):\n${exercicio.solucaoReferencia}`,
    `Código do aluno (${exercicio.linguagem}):\n\`\`\`\n${codigo}\n\`\`\``,
  ].join("\n\n");
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  const { exercicioId, codigo, tentativa } = (body ?? {}) as {
    exercicioId?: unknown;
    codigo?: unknown;
    tentativa?: unknown;
  };

  if (
    typeof exercicioId !== "string" ||
    typeof codigo !== "string" ||
    typeof tentativa !== "number" ||
    !Number.isFinite(tentativa)
  ) {
    return NextResponse.json({ erro: "Parâmetros inválidos." }, { status: 400 });
  }

  const aula = carregarAula();
  const exercicio = acharExercicio(aula, exercicioId);
  if (!exercicio) {
    return NextResponse.json(
      { erro: "Exercício não encontrado." },
      { status: 404 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return NextResponse.json(
      { erro: "Credencial não configurada no servidor (ANTHROPIC_API_KEY ou ANTHROPIC_AUTH_TOKEN)." },
      { status: 500 }
    );
  }

  const client = new Anthropic();
  const modelo = process.env.BEGOOD_MODEL ?? MODELO_PADRAO;

  let avaliacao;
  try {
    const resposta = await client.messages.parse({
      model: modelo,
      max_tokens: 2000,
      system: systemPrompt(),
      output_config: { format: zodOutputFormat(AvaliacaoSchema) },
      messages: [{ role: "user", content: userPrompt(exercicio, codigo) }],
    });

    if (resposta.stop_reason === "refusal" || !resposta.parsed_output) {
      return NextResponse.json(
        { erro: "Não foi possível avaliar o código." },
        { status: 502 }
      );
    }
    avaliacao = resposta.parsed_output;
  } catch {
    return NextResponse.json(
      { erro: "Erro ao chamar a IA. Tente novamente." },
      { status: 502 }
    );
  }

  // Regra dos 3 erros — decidida no SERVIDOR (fonte da verdade).
  let revisao: Revisao;
  if (avaliacao.acertou) {
    revisao = {
      acertou: true,
      concluido: true,
      tentativa,
      dicas: [],
      respostaFinal: null,
      resumo: avaliacao.resumo,
    };
  } else if (tentativa >= 3) {
    revisao = {
      acertou: false,
      concluido: true,
      tentativa,
      dicas: avaliacao.dicas,
      respostaFinal: exercicio.solucaoReferencia, // revela só agora
      resumo: avaliacao.resumo,
    };
  } else {
    revisao = {
      acertou: false,
      concluido: false,
      tentativa,
      dicas: avaliacao.dicas,
      respostaFinal: null,
      resumo: avaliacao.resumo,
    };
  }

  return NextResponse.json(revisao);
}
