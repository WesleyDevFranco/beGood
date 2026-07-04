# beGood

Transforma qualquer codebase num **laboratório de aprendizado interativo**: a IA lê um
projeto, monta uma aula (teoria + exercícios), e o dev pratica reescrevendo o código —
com revisão da IA e dicas progressivas.

Arquitetura completa em [`ARQUITETURA.md`](./ARQUITETURA.md).
Mockups de design em [`design/`](./design/).

---

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **Monaco Editor** (editor de código) · **react-markdown** (teoria)
- **Claude API** (`@anthropic-ai/sdk`, modelo `claude-opus-4-8`) — núcleo/geração de aulas
- Deploy: **VPS Hostinger** (`next start` + PM2 + Nginx — ver ARQUITETURA §8)

## Estrutura

```
app/                 # Next.js (frontend + futuras API routes)
  page.tsx           #   entrada
  laboratorio/       #   o caderno (laboratório)
components/           # LessonNotebook, TheoryBlock, ExerciseCell...
lib/
  types.ts           # schemas Zod + tipos (contrato da Aula) — compartilhado
scripts/             # Núcleo/CLI (Fase 0): gera aula.json a partir de um diretório
  gerar-aula.ts      #   ponto de entrada
  scanner.ts · gerarAula.ts · env.ts
data/
  aula.exemplo.json  # aula mock que o laboratório renderiza na Fase 1
```

---

## Rodando

```bash
npm install
cp .env.example .env.local   # e preencha ANTHROPIC_API_KEY
```

### Estudar um projeto seu — comando único ✅ (Fase 3)

```bash
npm run begood -- <diretorio-do-projeto>
# ex.: npm run begood -- ../meu-projeto-com-ia
```

Escaneia o diretório → gera a aula com a Claude API → sobe o laboratório → abre o
navegador em `/laboratorio`. É o fluxo principal: rode local e estude qualquer projeto.

> A aula gerada vai para `data/aula.atual.json` (fora do git). Sem ela, o laboratório
> mostra a aula de exemplo — útil pra desenvolver a interface sem gastar API.

### Laboratório (só a interface) ✅ (Fase 1)

```bash
npm run dev        # http://localhost:3000  →  /laboratorio
```

Renderiza a aula de exemplo (`data/aula.exemplo.json`) como um **caderno**: teoria
intercalada com **células de exercício** (editor Monaco + "Revisar com IA").

A revisão é **real** (Fase 2): o botão "Revisar com IA" chama `POST /api/revisar`, que
avalia o código do aluno contra os critérios via Claude API. A **regra dos 3 erros** e a
**solução de referência** vivem no servidor — a solução nunca vai para o navegador antes
da hora. Requer `ANTHROPIC_API_KEY` no `.env.local` (o Next carrega automaticamente).

### Só gerar a aula (sem subir o servidor) — Fase 0 ✅

```bash
npm run gerar-aula -- <diretorio-do-projeto> [saida.json]
```

Escaneia o diretório, chama a Claude API com **structured outputs** e escreve a aula
validada (modelo de blocos) — por padrão em `data/aula.atual.json`. Depois, `npm run dev`
abre o laboratório com ela.

---

## Roadmap

- ✅ **Fase 0** — Núcleo (CLI): diretório → `aula.json`.
- ✅ **Fase 1** — Laboratório (Next.js): renderiza o caderno com editor.
- ✅ **Fase 2** — Revisão real com IA (`/api/revisar` + regra dos 3 erros no backend).
- ✅ **Fase 3** — Fluxo local num comando: `begood ./projeto` liga núcleo ↔ laboratório.
- 🔮 **Futuro** — Deploy de demo na Hostinger; melhorias de UX.

Ver [`ARQUITETURA.md`](./ARQUITETURA.md) §6.
