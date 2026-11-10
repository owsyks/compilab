"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  BookOpen,
  Play,
  GitBranch,
  Table2,
  Braces,
} from "lucide-react";
import { useUI } from "./providers";
import { Logo, Controls } from "./shell";
import { Badge } from "./ui";
import { modules, EXPRESSION } from "@/lib/courses";
import { computeSets, parseGrammar, parseLL1 } from "@/lib/compiler/grammar";
const sets = computeSets(parseGrammar(EXPRESSION));
export function Landing() {
  const { t } = useUI();
  const [tab, setTab] = useState("sets");
  const [step, setStep] = useState(0);
  const trace = parseLL1(parseGrammar(EXPRESSION), "id + id * id");
  return (
    <div className="marketing">
      <header className="marketing-header">
        <Logo />
        <nav>
          <Link href="/curriculum">{t("Le parcours", "Curriculum")}</Link>
          <Link href="/lab/first-follow">
            {t("Les laboratoires", "Laboratories")}
          </Link>
        </nav>
        <div className="marketing-actions">
          <Controls />
          <Link href="/dashboard" className="button secondary">
            {t("Ouvrir mon espace", "Open workspace")}
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="small-square" /> COMPILATION, L3 · ORAN 1
            </div>
            <h1>
              {t("La grammaire devient", "Make sense of")}
              <br />
              <em>{t("plus claire.", "the grammar.")}</em>
            </h1>
            <p>
              {t(
                "Comprendre une règle. Observer chaque étape. S’entraîner jusqu’à savoir l’expliquer. Votre atelier d’analyse lexicale et syntaxique, du premier token au dernier état LR.",
                "Understand a rule. Observe every step. Practice until you can explain it. Your lexical and syntactic analysis workbench, from the first token to the final LR state.",
              )}
            </p>
            <div className="hero-buttons">
              <Link href="/learn" className="button primary large">
                {t("Commencer mon parcours", "Start learning")}
                <ArrowRight size={17} />
              </Link>
              <Link href="/curriculum" className="button ghost large">
                <BookOpen size={17} />
                {t("Explorer le cours", "Explore the course")}
              </Link>
            </div>
            <div className="hero-note">
              <Check size={14} />
              {t(
                "Outils déterministes · FR / EN · Sans abonnement",
                "Deterministic tools · FR / EN · No subscription",
              )}
            </div>
          </div>
          <div className="hero-aside">
            <div className="annotation">
              {t("Un résultat. Toutes les étapes.", "One result. Every step.")}
            </div>
            <div className="preview-window">
              <div className="preview-title">
                <span className="window-dots">
                  <i />
                  <i />
                  <i />
                </span>
                <span>compilab / laboratoire</span>
                <Badge tone="green">
                  {t("Calcul réel", "Live computation")}
                </Badge>
              </div>
              <div className="preview-tabs" role="tablist">
                {[
                  ["sets", "FIRST / FOLLOW"],
                  ["trace", t("Trace LL(1)", "LL(1) trace")],
                ].map(([id, label]) => (
                  <button
                    role="tab"
                    aria-selected={tab === id}
                    onClick={() => setTab(id)}
                    key={id}
                    className={tab === id ? "active" : ""}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="preview-grid">
                <div className="preview-grammar">
                  <span className="tiny-label">
                    {t("GRAMMAIRE", "GRAMMAR")}
                  </span>
                  <pre>{EXPRESSION.replace(/->/g, "→")}</pre>
                  <div className="computed-label">
                    <span className="status-dot" /> LL(1) ·{" "}
                    {t("aucun conflit", "no conflicts")}
                  </div>
                </div>
                <div className="preview-result">
                  {tab === "sets" ? (
                    <>
                      <span className="tiny-label">
                        {t("ENSEMBLES CALCULÉS", "COMPUTED SETS")}
                      </span>
                      <table>
                        <thead>
                          <tr>
                            <th>N</th>
                            <th>FIRST</th>
                            <th>FOLLOW</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.keys(sets.first).map((n) => (
                            <tr key={n}>
                              <td>{n}</td>
                              <td>{`{ ${sets.first[n].join(", ")} }`}</td>
                              <td>{`{ ${sets.follow[n].join(", ")} }`}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="proof-note">
                        ↳{" "}
                        {t(
                          "E′ est annulable : FOLLOW(E) se propage à T.",
                          "E′ is nullable: FOLLOW(E) propagates to T.",
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="tiny-label">id + id * id $</span>
                      <div className="mini-trace">
                        <small>{t("PILE", "STACK")}</small>
                        <code>{trace.steps[step].stack}</code>
                        <small>
                          ACTION {step + 1}/{trace.steps.length}
                        </small>
                        <code>{trace.steps[step].action}</code>
                      </div>
                      <button
                        className="button secondary"
                        onClick={() => setStep((step + 1) % trace.steps.length)}
                      >
                        <Play size={13} />
                        {t("Étape suivante", "Next step")}
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="preview-footer">
                <span>ε ≠ $</span>
                <span>
                  {t(
                    "Chaque ajout a une justification.",
                    "Every addition has a reason.",
                  )}
                </span>
                <ArrowUpRight size={14} />
              </div>
            </div>
            <div className="aside-caption">
              <span>
                01 —{" "}
                {t("COMPRENDRE, PUIS CONSTRUIRE", "UNDERSTAND, THEN BUILD")}
              </span>
              <span>G = (N, T, P, S)</span>
            </div>
          </div>
        </section>
        <div className="landing-rule">
          <span>
            {t("DU CARACTÈRE À LA STRUCTURE", "FROM CHARACTER TO STRUCTURE")}
          </span>
          <div />
          <span>lexer → grammar → parser</span>
        </div>
        <section className="proofs">
          <div>
            <Table2 size={22} />
            <span className="tiny-label">01 / FIRST & FOLLOW</span>
            <h3>{t("Fini les ensembles devinés.", "No more guessed sets.")}</h3>
            <p>
              {t(
                "Un calcul au point fixe, avec la production qui justifie chaque ajout.",
                "Fixed-point computation with the production behind every addition.",
              )}
            </p>
            <Link href="/lab/first-follow">
              {t("Suivre le calcul", "Follow the computation")}
              <ArrowRight size={14} />
            </Link>
          </div>
          <div>
            <GitBranch size={22} />
            <span className="tiny-label">
              02 / {t("GRAMMAIRES", "GRAMMARS")}
            </span>
            <h3>
              {t("Une dérivation prend forme.", "A derivation takes shape.")}
            </h3>
            <p>
              {t(
                "Construire de vrais arbres et voir pourquoi deux interprétations peuvent être valides.",
                "Build real trees and see why two interpretations can both be valid.",
              )}
            </p>
            <Link href="/lab/grammar">
              {t("Construire un arbre", "Build a tree")}
              <ArrowRight size={14} />
            </Link>
          </div>
          <div>
            <Braces size={22} />
            <span className="tiny-label">03 / LR(0) → LR(1)</span>
            <h3>
              {t("Un conflit, une preuve.", "A conflict, with evidence.")}
            </h3>
            <p>
              {t(
                "Comparer les états et les tables LR. Aucune alternative effacée pour faire marcher le résultat.",
                "Compare LR states and tables. Competing actions stay visible in every conflicted cell.",
              )}
            </p>
            <Link href="/lab/lr">
              {t("Comparer les méthodes", "Compare methods")}
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>
        <section className="landing-course">
          <div className="section-heading">
            <div>
              <div className="eyebrow">
                {t("LE PARCOURS", "THE LEARNING PATH")}
              </div>
              <h2>
                {t(
                  "Une méthode, chapitre après chapitre.",
                  "One method, chapter by chapter.",
                )}
              </h2>
            </div>
            <Link href="/curriculum" className="text-link">
              {t("Tout le programme", "Full syllabus")}
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="chapter-list">
            {modules.map((m, i) => (
              <Link href={`/learn?module=${m.id}`} key={m.id}>
                <span className="chapter-num">0{i + 1}</span>
                <strong>{t(m.title, m.titleEn)}</strong>
                <span>
                  {m.lessons.length} {t("leçons", "lessons")}
                </span>
                <ArrowUpRight size={17} />
              </Link>
            ))}
          </div>
        </section>
        <section className="workflow">
          <div>
            <span>01</span>
            <h3>{t("Lire la méthode", "Read the method")}</h3>
            <p>
              {t(
                "Des leçons courtes et le vocabulaire exact de votre cours.",
                "Short lessons and the exact terminology of your course.",
              )}
            </p>
          </div>
          <div>
            <span>02</span>
            <h3>{t("Manipuler un exemple", "Explore an example")}</h3>
            <p>
              {t(
                "Modifier une grammaire et voir le résultat recalculé.",
                "Edit a grammar and inspect recomputed results.",
              )}
            </p>
          </div>
          <div>
            <span>03</span>
            <h3>
              {t("Vérifier sa compréhension", "Check your understanding")}
            </h3>
            <p>
              {t(
                "Des exercices corrigés avec des preuves et une progression personnelle.",
                "Exercises checked with evidence and personal progress tracking.",
              )}
            </p>
          </div>
        </section>
        <section className="faq">
          <h2>{t("Avant de commencer", "Before you begin")}</h2>
          <details>
            <summary>
              {t("Faut-il une clé NVIDIA ?", "Do I need an NVIDIA key?")}
            </summary>
            <p>
              {t(
                "Les leçons, les laboratoires et la banque vérifiée fonctionnent sans clé. Le tuteur IA nécessite une clé configurée côté serveur.",
                "Lessons, labs and the verified bank work without a key. The AI tutor requires server-side configuration.",
              )}
            </p>
          </details>
          <details>
            <summary>
              {t(
                "Les résultats sont-ils produits par une IA ?",
                "Are results generated by AI?",
              )}
            </summary>
            <p>
              {t(
                "Les ensembles, tables et traces sont calculés par des algorithmes testés. Les explications IA sont clairement distinguées.",
                "Sets, tables and traces are computed by tested algorithms. AI explanations are clearly labeled.",
              )}
            </p>
          </details>
          <details>
            <summary>
              {t("Puis-je réviser en anglais ?", "Can I study in English?")}
            </summary>
            <p>
              {t(
                "Oui. Le sélecteur FR / EN adapte l’interface et les leçons, en conservant le vocabulaire académique français.",
                "Yes. FR / EN switches the interface and lessons while preserving French academic terms.",
              )}
            </p>
          </details>
        </section>
      </main>
      <footer className="marketing-footer">
        <Logo />
        <span>Understand the grammar. Master the compiler.</span>
        <Link href="/dashboard">
          {t("Ouvrir mon espace", "Open workspace")}
          <ArrowRight size={14} />
        </Link>
      </footer>
    </div>
  );
}
