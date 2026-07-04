import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renderiza um bloco de teoria (markdown) do caderno. */
export function TheoryBlock({ conteudo }: { conteudo: string }) {
  return (
    <div className="md text-[15px]">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{conteudo}</ReactMarkdown>
    </div>
  );
}
