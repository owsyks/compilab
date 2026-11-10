import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";
import "katex/dist/katex.min.css";
export const metadata: Metadata = {
  title: {
    default: "Compilab — comprendre la grammaire",
    template: "%s · Compilab",
  },
  description:
    "Un atelier de compilation pour apprendre l’analyse lexicale et syntaxique, pas à pas. Université Oran 1, L3.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
