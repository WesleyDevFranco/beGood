import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "beGood — Laboratório de código",
  description:
    "Transforma qualquer codebase num laboratório de aprendizado interativo.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
