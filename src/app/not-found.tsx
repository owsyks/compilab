import Link from "next/link";
export default function NotFound() {
  return (
    <main className="fatal-error">
      <span className="eyebrow">404 / COMPILAB</span>
      <h1>Cette page n’existe pas.</h1>
      <p>This page could not be found.</p>
      <Link className="button primary" href="/dashboard">
        Revenir à mon espace / Back to workspace
      </Link>
    </main>
  );
}
