"use client";
import Link from "next/link";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="fatal-error">
      <h1>Impossible d’ouvrir cet espace.</h1>
      <p>
        Vérifiez la connexion PostgreSQL et réessayez. / Check the PostgreSQL
        connection and retry.
      </p>
      <button className="button primary" onClick={reset}>
        Réessayer / Retry
      </button>
      <Link href="/">Compilab</Link>
    </main>
  );
}
