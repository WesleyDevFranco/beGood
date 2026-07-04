import { Laboratorio } from "@/components/Laboratorio";
import { carregarAula, sanitizarAula } from "@/lib/aula";

// Lê a aula atual (arquivo) a cada requisição, sem prerender estático — assim
// gerar uma nova aula com o núcleo reflete na hora, sem rebuild.
export const dynamic = "force-dynamic";

// Carrega a aula no servidor e envia ao cliente a versão SEM soluções.
// A solução só é revelada pela rota /api/revisar após 3 tentativas.
export default function LaboratorioPage() {
  const aulaPublica = sanitizarAula(carregarAula());
  return <Laboratorio aula={aulaPublica} />;
}
