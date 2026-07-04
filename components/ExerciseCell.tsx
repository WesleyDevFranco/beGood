"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { ExercicioPublico, Revisao } from "@/lib/types";

// Monaco acessa `window`, então carrega só no client (sem SSR).
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="bg-zinc-900 text-zinc-500 text-sm p-4 code">
      carregando editor…
    </div>
  ),
});

interface Props {
  exercicioId: string;
  exercicio: ExercicioPublico;
  numero: number;
  bloqueado: boolean;
  concluido: boolean;
  onConcluir: () => void;
}

export function ExerciseCell({
  exercicioId,
  exercicio,
  numero,
  bloqueado,
  concluido,
  onConcluir,
}: Props) {
  const [codigo, setCodigo] = useState(exercicio.codigoInicial);
  const [tentativa, setTentativa] = useState(0);
  const [revisando, setRevisando] = useState(false);
  const [revisao, setRevisao] = useState<Revisao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // --- Estados visuais especiais ---------------------------------------

  if (bloqueado) {
    return (
      <section className="rounded-xl border border-dashed border-zinc-300 bg-white/50 px-4 py-5 text-sm text-zinc-400">
        🔒 Exercício {numero} — conclua o anterior para desbloquear
      </section>
    );
  }

  if (concluido) {
    return (
      <section className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5">
        <span className="text-sm font-medium text-emerald-800">
          ✓ Exercício {numero} — concluído
        </span>
      </section>
    );
  }

  // --- Revisão real (chama /api/revisar) -------------------------------
  const revelou = !!revisao?.respostaFinal;

  async function revisar() {
    if (revisando) return;
    setRevisando(true);
    setErro(null);

    const novaTentativa = tentativa + 1;
    try {
      const res = await fetch("/api/revisar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exercicioId, codigo, tentativa: novaTentativa }),
      });

      const dados = await res.json();
      if (!res.ok) {
        setErro(dados?.erro ?? "Falha ao revisar.");
        return;
      }

      const revisaoRecebida = dados as Revisao;
      setRevisao(revisaoRecebida);
      setTentativa(revisaoRecebida.tentativa ?? novaTentativa);

      // Acertou → conclui automaticamente (o pai troca para "concluído").
      if (revisaoRecebida.acertou) onConcluir();
    } catch {
      setErro("Erro de rede ao revisar. Tente novamente.");
    } finally {
      setRevisando(false);
    }
  }

  return (
    <section className="rounded-xl border-2 border-zinc-300 bg-white overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
        <span className="text-sm font-medium text-zinc-800">
          Exercício {numero}
        </span>
        <span className="text-xs text-zinc-500">{exercicio.linguagem}</span>
      </div>

      <p className="px-4 py-3 text-sm leading-relaxed border-b border-zinc-100">
        {exercicio.enunciado}
      </p>

      {/* Editor */}
      <MonacoEditor
        height="220px"
        language={exercicio.linguagem}
        theme="vs-dark"
        value={codigo}
        onChange={(valor) => setCodigo(valor ?? "")}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 12, bottom: 12 },
        }}
      />

      {/* Ação + resultado */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-end">
          <button
            onClick={revisar}
            disabled={revisando || revelou}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            {revisando ? "Revisando…" : "▶ Revisar com IA"}
          </button>
        </div>

        {erro && (
          <div className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {erro}
          </div>
        )}

        {/* Errou e ainda não revelou → dicas */}
        {revisao && !revisao.acertou && !revelou && (
          <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
            <div className="text-amber-700 font-medium mb-1">
              ❌ Tentativa {revisao.tentativa} de 3
            </div>
            {revisao.resumo && (
              <p className="text-amber-900 mb-1">{revisao.resumo}</p>
            )}
            <ul className="list-disc pl-5 text-amber-900 space-y-0.5">
              {revisao.dicas.map((dica, i) => (
                <li key={i}>{dica}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Revelou a resposta (após 3 tentativas) */}
        {revelou && (
          <div className="mt-3 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm">
            <div className="text-emerald-700 font-medium mb-2">
              💡 Resposta de referência (após 3 tentativas)
            </div>
            <pre className="code bg-zinc-900 text-zinc-100 rounded-lg p-3 text-xs overflow-x-auto">
              {revisao?.respostaFinal}
            </pre>
            <button
              onClick={onConcluir}
              className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
            >
              Concluir e continuar →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
