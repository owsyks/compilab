"use client";
import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Workspace fatal error caught by boundary:", error);
  }, [error]);

  return (
    <main className="fatal-error">
      <span className="eyebrow">COMPILAB · SYSTÈME</span>
      <h1>Impossible d’ouvrir cet espace.</h1>
      <p>
        Une erreur inattendue est survenue. Vérifiez la connexion ou continuez en
        mode autonome. / An unexpected error occurred. Check the connection or
        continue in offline mode.
      </p>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
        <button className="button primary" onClick={reset}>
          Réessayer / Retry
        </button>
        <button
          className="button secondary"
          onClick={() => {
            window.location.href = "/dashboard";
          }}
        >
          Tableau de bord / Dashboard
        </button>
      </div>
      <Link href="/">Accueil Compilab</Link>
    </main>
  );
}
