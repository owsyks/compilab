"use client";
import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { Logo, Controls } from "./shell";
import { ErrorBox } from "./ui";
import { useUI } from "./providers";
import { authClient } from "@/lib/auth-client";
export function AuthForm({
  register = false,
  demo = false,
}: {
  register?: boolean;
  demo?: boolean;
}) {
  const { t } = useUI();
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = register
        ? await authClient.signUp.email({ email, password, name })
        : await authClient.signIn.email({ email, password });
      if (r.error) throw new Error(r.error.message ?? "Authentication failed.");
      router.push(register ? "/onboarding" : "/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <header>
        <Logo />
        <Controls />
      </header>
      <div className="auth-layout">
        <div className="auth-editorial">
          <div className="eyebrow">
            {t("VOTRE ATELIER DE COMPILATION", "YOUR COMPILATION WORKBENCH")}
          </div>
          <h1>
            {t("Comprendre.", "Understand.")}
            <br />
            {t("Construire.", "Build.")}
            <br />
            <em>{t("Maîtriser.", "Master.")}</em>
          </h1>
          <pre>
            E → T E′
            <br />
            E′ → + T E′ | ε
          </pre>
          <p>
            {t(
              "Une règle à la fois, un raisonnement qui reste.",
              "One rule at a time. Understanding that stays.",
            )}
          </p>
        </div>
        <div className="auth-card">
          <span className="eyebrow">
            {register
              ? "01 / " + t("COMMENCER", "GET STARTED")
              : t("BON RETOUR", "WELCOME BACK")}
          </span>
          <h2>
            {register
              ? t("Créer mon espace", "Create my workspace")
              : t("Reprendre le fil.", "Pick up where you left off.")}
          </h2>
          <p className="muted">
            {t(
              "Votre progression et vos exercices, au même endroit.",
              "Your progress and exercises, in one place.",
            )}
          </p>
          <form onSubmit={submit}>
            {register && (
              <label>
                {t("Prénom ou pseudonyme", "Name or nickname")}
                <input
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  minLength={2}
                  maxLength={80}
                  required
                />
              </label>
            )}
            <label>
              {t("Adresse e-mail", "Email address")}
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={200}
              />
            </label>
            <label>
              {t("Mot de passe", "Password")}
              <input
                type="password"
                aria-label={t("Mot de passe", "Password")}
                aria-describedby={register ? "password-help" : undefined}
                autoComplete={register ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={register ? 12 : 1}
                maxLength={72}
                required
              />
              {register && (
                <small id="password-help">
                  {t("12 caractères minimum.", "At least 12 characters.")}
                </small>
              )}
            </label>
            <ErrorBox message={error} />
            <button
              type="submit"
              disabled={busy}
              className="button primary full"
            >
              {busy
                ? t("Connexion…", "Connecting…")
                : register
                  ? t("Créer mon compte", "Create account")
                  : t("Se connecter", "Sign in")}
              <ArrowRight size={16} />
            </button>
          </form>
          <p className="auth-switch">
            {register
              ? t("Déjà un compte ?", "Already have an account?")
              : t("Nouveau sur Compilab ?", "New to Compilab?")}{" "}
            <Link href={register ? "/login" : "/register"}>
              {register
                ? t("Se connecter", "Sign in")
                : t("Créer un compte", "Create an account")}
            </Link>
          </p>
          {demo && !register && (
            <div className="demo-note">
              <strong>
                {t(
                  "Compte de démonstration local",
                  "Local demonstration account",
                )}
              </strong>
              <code>demo@compilab.local</code>
              <code>Compilab-demo-2026!</code>
              <button
                className="text-button"
                onClick={() => {
                  setEmail("demo@compilab.local");
                  setPassword("Compilab-demo-2026!");
                }}
              >
                {t("Remplir les identifiants", "Fill demo credentials")}
              </button>
            </div>
          )}
          <div className="privacy-note">
            <LockKeyhole size={13} />
            {t(
              "Vos réponses restent dans votre espace personnel.",
              "Your answers stay in your personal workspace.",
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
