# beGood — Laboratório de Aprendizado de Código

Ferramenta que transforma qualquer codebase num **laboratório de aprendizado interativo**:
a IA lê um projeto, monta uma aula, gera exercícios de reescrita de código, revisa com
dicas progressivas (resposta só após 3 erros) e recomenda material de estudo no fim.

Público-alvo: **dev júnior**. Ideia original em `ideiaProjetoAprendizado.excalidraw`.

---

## 1. Stack

| Camada | Escolha | Motivo |
|---|---|---|
| Frontend + Backend | **Next.js (App Router) + TypeScript** | Uma peça só; API Routes = backend. Forte pra portfólio. |
| Chamada à IA | **`@anthropic-ai/sdk`** | SDK oficial. Roda só no servidor. |
| Modelo | **`claude-opus-4-8`** | Mais capaz atual. `thinking: adaptive`. |
| Estilo | Tailwind CSS | Rápido de prototipar, visual limpo. |
| Editor de código | Monaco (`@monaco-editor/react`) | Mesmo editor do VS Code. |
| Deploy | **Hostinger (VPS / plano com Node.js)** | `next start` atrás de PM2 + Nginx. Ver seção 8. |

**Regra de ouro de segurança:** a `ANTHROPIC_API_KEY` fica em variável de ambiente
no servidor (`.env.local`). NUNCA vai pro browser.

---

## 2. Fluxo de dados

```
[1] Dev aponta um diretório
        │  (CLI local  ->  gera aula.json)
        ▼
[2] Claude API lê os arquivos e devolve uma "Aula" estruturada (JSON)
        │
        ▼
[3] Frontend (o "Laboratório") renderiza a aula:
        ├── Conteúdo teórico da aula
        ├── Exercícios: "com base na aula e no projeto, reescreva X"
        ├── Editor de código (Monaco) para o dev escrever
        └── Botão "Revisar com IA"
        ▼
[4] Revisão: Claude compara o código do dev com o esperado
        ├── errou -> dá DICA (não a resposta)
        ├── 3 erros -> revela a resposta final
        └── acertou -> libera próximo exercício
        ▼
[5] Fim do laboratório: sugere fontes (vídeos, artigos, docs)
```

O **contrato entre backend e frontend é o `aula.json`** — o frontend só sabe renderizar
esse formato. Isso desacopla as duas metades: dá pra desenvolver a UI com um JSON mockado
antes da IA existir.

---

## 3. Modelo de dados — a "Aula" (`aula.json`)

```ts
type Aula = {
  titulo: string;
  projetoResumo: string;           // o que a IA entendeu do projeto
  temas: string[];                 // tecnologias/conceitos abordados
  secoes: Secao[];
  referencias: Referencia[];       // sugeridas no fim
};

type Secao = {
  id: string;
  titulo: string;
  explicacao: string;              // markdown
  exercicio: Exercicio;
};

type Exercicio = {
  enunciado: string;               // "com base na aula, reescreva a função X"
  codigoInicial: string;           // stub que o dev completa
  linguagem: string;               // "typescript", "python"...
  solucaoReferencia: string;       // NUNCA enviada ao browser antes da hora
  criteriosAvaliacao: string[];    // o que a IA checa na revisão
};

type Referencia = {
  titulo: string;
  tipo: "artigo" | "video" | "documentacao";
  url?: string;
  porque: string;                  // por que estudar isso
};

// Resultado de cada revisão
type Revisao = {
  acertou: boolean;
  dicas: string[];                 // se errou
  tentativa: number;               // 1..3
  respostaFinal?: string;          // só quando tentativa === 3
};
```

---

## 4. Telas (frontend)

1. **Entrada** — colar/subir o `aula.json` (ou, no futuro, apontar diretório).
2. **Laboratório** — layout em 2 colunas:
   - Esquerda: aula + enunciado do exercício (markdown).
   - Direita: editor Monaco + botão "Revisar com IA".
   - Rodapé: modal de resultado (dicas ou resposta final).
3. **Conclusão** — lista de referências recomendadas + progresso.

---

## 5. Backend — API Routes

| Rota | Função |
|---|---|
| `POST /api/gerar-aula` | Recebe o conteúdo do projeto, chama Claude, devolve `Aula`. |
| `POST /api/revisar` | Recebe código do dev + exercício + nº da tentativa, devolve `Revisao`. |

A regra "3 tentativas" mora no **backend** (fonte da verdade), nunca no cliente —
senão dá pra burlar e ver a resposta no primeiro erro.

---

## 6. Fases de construção

- **Fase 0 — Núcleo (CLI):** script que lê um diretório, chama a Claude API e cospe
  `aula.json`. Valida que o "cérebro" funciona antes de qualquer UI.
- **Fase 1 — Laboratório (frontend):** renderiza `aula.json` (mockado), com editor Monaco.
- **Fase 2 — Revisão com IA:** rota `/api/revisar` + dicas progressivas + regra dos 3 erros.
- **Fase 3 — Referências + conclusão.**
- **Fase 4 (futuro):** apontar diretório pela própria web; integração Azure da empresa;
  empacotar a lógica também como skill do Claude Code (bônus de portfólio).

---

## 7. Decisões em aberto (revisar antes de codar)

- Persistência: precisa salvar progresso? (por ora: em memória / localStorage)
- Multi-usuário / login: fora do MVP.
- Como o projeto entra: CLI primeiro; upload/diretório-web depois.

---

## 8. Deploy na Hostinger

Como as **API Routes rodam no servidor** (é lá que a `ANTHROPIC_API_KEY` fica escondida),
o app precisa de um **runtime Node.js**. Isso descarta hospedagem compartilhada estática:
é preciso um plano **VPS** (recomendado) ou um plano Hostinger com suporte a Node.js.

> ⚠️ **Não dá pra usar `next export` (site estático)** — sem servidor Node, as rotas
> `/api/*` não existem e a chave de API vazaria pro browser. O runtime Node é obrigatório.

### Passo a passo (VPS)

1. **No VPS:** instalar Node.js LTS (via `nvm`), `git` e `pm2` (`npm i -g pm2`).
2. **Build:** `git clone` do projeto → `npm ci` → `npm run build`.
3. **Variável de ambiente:** criar `.env.local` com `ANTHROPIC_API_KEY=...` (fora do git).
4. **Rodar:** `pm2 start "npm run start" --name begood` → `pm2 save` → `pm2 startup`
   (mantém o app de pé e reinicia sozinho no boot). Next.js sobe na porta `3000`.
5. **Nginx (reverse proxy):** encaminha `:80/:443` → `localhost:3000`.
6. **HTTPS:** `certbot` (Let's Encrypt) para TLS no domínio da Hostinger.
7. **Deploys futuros:** `git pull` → `npm ci` → `npm run build` → `pm2 reload begood`.

### Config de Nginx (esqueleto)

```nginx
server {
  listen 80;
  server_name seu-dominio.com;
  location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

> Se o plano for **Node.js hosting** (não VPS): o painel da Hostinger cuida do
> processo e do proxy; basta apontar o comando de start (`npm run start`), a porta
> e cadastrar a env var `ANTHROPIC_API_KEY` no painel — sem PM2/Nginx manual.
