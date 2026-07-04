import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-lg text-center">
        <h1 className="text-4xl font-bold mb-3">
          <span className="text-emerald-600">be</span>Good
        </h1>
        <p className="text-zinc-600 mb-8">
          Transforme qualquer projeto num laboratório de aprendizado: a IA lê o
          código, monta uma aula e te faz praticar reescrevendo — com dicas
          progressivas.
        </p>
        <Link
          href="/laboratorio"
          className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 py-3 rounded-lg"
        >
          Abrir o laboratório →
        </Link>
        <p className="text-xs text-zinc-400 mt-6">
          Fase 1 — renderizando uma aula de exemplo (aula.exemplo.json).
        </p>
      </div>
    </main>
  );
}
