"use client";

import { useMemo, useState } from "react";
import type { AulaPublica, Referencia } from "@/lib/types";
import { TheoryBlock } from "./TheoryBlock";
import { ExerciseCell } from "./ExerciseCell";

const ICONE_REFERENCIA: Record<Referencia["tipo"], string> = {
  artigo: "📝",
  video: "🎥",
  documentacao: "📄",
};

export function Laboratorio({ aula }: { aula: AulaPublica }) {
  // Ordem global dos exercícios (para numeração, progresso e desbloqueio).
  const { ordem, numeroPorId } = useMemo(() => {
    const ordem: string[] = [];
    const numeroPorId: Record<string, number> = {};
    let n = 0;
    for (const secao of aula.secoes) {
      for (const bloco of secao.blocos) {
        if (bloco.tipo === "exercicio") {
          n += 1;
          numeroPorId[bloco.id] = n;
          ordem.push(bloco.id);
        }
      }
    }
    return { ordem, numeroPorId };
  }, [aula]);

  const total = ordem.length;
  const [concluidos, setConcluidos] = useState<string[]>([]);

  const concluir = (id: string) =>
    setConcluidos((atual) => (atual.includes(id) ? atual : [...atual, id]));

  const feitos = concluidos.length;
  const atual = Math.min(feitos + 1, total);
  const progresso = total === 0 ? 0 : Math.round((feitos / total) * 100);

  return (
    <div className="min-h-screen">
      {/* Cabeçalho fixo com progresso */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-zinc-200">
        <div className="flex items-center justify-between px-5 h-14">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-bold text-emerald-600 text-lg shrink-0">
              beGood
            </span>
            <span className="text-zinc-300">/</span>
            <span className="text-sm text-zinc-600 truncate">{aula.titulo}</span>
          </div>
          <span className="text-sm text-zinc-500 shrink-0">
            {feitos >= total && total > 0
              ? "Concluído 🎉"
              : `Exercício ${atual} de ${total}`}
          </span>
        </div>
        <div className="h-1 bg-zinc-200">
          <div
            className="h-1 bg-emerald-500 transition-all"
            style={{ width: `${progresso}%` }}
          />
        </div>
      </header>

      {/* Caderno */}
      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        <p className="text-sm text-zinc-500">{aula.projetoResumo}</p>

        {aula.secoes.map((secao, i) => (
          <div key={secao.id} className="space-y-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600 mb-1">
                Seção {i + 1}
              </div>
              <h2 className="text-2xl font-bold">{secao.titulo}</h2>
            </div>

            {secao.blocos.map((bloco) => {
              if (bloco.tipo === "teoria") {
                return <TheoryBlock key={bloco.id} conteudo={bloco.conteudo} />;
              }
              const numero = numeroPorId[bloco.id];
              const indice = ordem.indexOf(bloco.id);
              const bloqueado = ordem
                .slice(0, indice)
                .some((id) => !concluidos.includes(id));
              const concluido = concluidos.includes(bloco.id);
              return (
                <ExerciseCell
                  key={bloco.id}
                  exercicioId={bloco.id}
                  exercicio={bloco.exercicio}
                  numero={numero}
                  bloqueado={bloqueado}
                  concluido={concluido}
                  onConcluir={() => concluir(bloco.id)}
                />
              );
            })}
          </div>
        ))}

        {/* Referências */}
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-3">
            Para se aprofundar
          </div>
          <ul className="space-y-2 text-sm">
            {aula.referencias.map((ref, i) => (
              <li key={i}>
                <span className="mr-1">{ICONE_REFERENCIA[ref.tipo]}</span>
                {ref.url ? (
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-emerald-700 hover:underline"
                  >
                    {ref.titulo}
                  </a>
                ) : (
                  <span className="font-medium">{ref.titulo}</span>
                )}
                <span className="text-zinc-500"> — {ref.porque}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
