"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Lightbulb,
  Save,
  Send,
  ArrowLeft,
  Plus,
  RotateCcw,
} from "lucide-react";
import { PublicExercise, Feedback } from "@/lib/exercise-types";
import { Attempt, Exam, api, useData, Bootstrap } from "@/lib/client";
import { parseGrammar, productionText } from "@/lib/compiler/grammar";
import { derive, Tree } from "@/lib/compiler/derivation";
import { scanFiche1 } from "@/lib/compiler/lexer";
import { useUI } from "./providers";
import { Badge, Empty, ErrorBox, Loading, PageTitle } from "./ui";
import { TreeDiagram } from "./diagrams";
import { modules } from "@/lib/courses";
export function AnswerWidget({
  exercise: e,
  value,
  onChange,
  disabled = false,
}: {
  exercise: PublicExercise;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
}) {
  const { t } = useUI();
  const record = (
    value && typeof value === "object" && !Array.isArray(value) ? value : {}
  ) as Record<string, string>;
  if (e.widget === "choice")
    return (
      <fieldset className="answer-choices" disabled={disabled}>
        <legend className="sr-only">{t("Votre réponse", "Your answer")}</legend>
        {e.options?.map((option, i) => (
          <label key={option} className={value === option ? "selected" : ""}>
            <input
              type="radio"
              name={`answer-${e.id}`}
              checked={value === option}
              onChange={() => onChange(option)}
            />
            <span className="choice-letter" aria-hidden="true">{String.fromCharCode(65 + i)}</span>
            <span>{option}</span>
          </label>
        ))}
      </fieldset>
    );
  if (e.widget === "multi") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <fieldset className="answer-choices" disabled={disabled}>
        <legend className="sr-only">
          {t("Plusieurs réponses possibles", "Multiple answers possible")}
        </legend>
        {e.options?.map((option) => (
          <label
            key={option}
            className={selected.includes(option) ? "selected" : ""}
          >
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() =>
                onChange(
                  selected.includes(option)
                    ? selected.filter((x) => x !== option)
                    : [...selected, option],
                )
              }
            />
            <span>{option}</span>
          </label>
        ))}
      </fieldset>
    );
  }
  if (e.widget === "parts" || e.widget === "table")
    return (
      <div className="answer-table table-scroll">
        <table>
          <thead>
            <tr>
              <th>
                {e.widget === "parts"
                  ? t("Composante", "Component")
                  : t("Case", "Cell")}
              </th>
              <th>{t("Votre réponse", "Your answer")}</th>
            </tr>
          </thead>
          <tbody>
            {e.fields?.map((field) => (
              <tr key={field}>
                <th className="mono">{field.replace("|", ", ")}</th>
                <td>
                  <input
                    disabled={disabled}
                    aria-label={`Answer ${field}`}
                    className="mono"
                    value={record[field] ?? ""}
                    onChange={(event) =>
                      onChange({ ...record, [field]: event.target.value })
                    }
                    placeholder={e.widget === "parts" ? "S, A…" : "r1…"}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  if (e.widget === "tokens") {
    const tokens = scanFiche1(e.input ?? "").tokens;
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{t("Lexème", "Lexeme")}</th>
              <th>{t("Classe", "Category")}</th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((token, i) => (
              <tr key={i}>
                <th className="mono">{token.lexeme}</th>
                <td>
                  <select
                    disabled={disabled}
                    aria-label={`Token ${i + 1}: ${token.lexeme}`}
                    value={selected[i] ?? ""}
                    onChange={(event) => {
                      const next = [...selected];
                      next[i] = event.target.value;
                      onChange(next);
                    }}
                  >
                    <option value="">{t("Choisir…", "Choose…")}</option>
                    {[
                      "keyword",
                      "identifier",
                      "integer",
                      "assignment",
                      "comparison",
                    ].map((kind) => (
                      <option key={kind}>{kind}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (e.widget === "tree")
    return (
      <TreeAnswer
        exercise={e}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    );
  if (e.widget === "open" || e.widget === "grammar")
    return (
      <label>
        {t("Votre réponse", "Your answer")}
        <textarea
          disabled={disabled}
          rows={e.widget === "grammar" ? 7 : 6}
          spellCheck={e.widget !== "grammar"}
          className={e.widget === "grammar" ? "code-editor" : ""}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          aria-label="Your answer"
        />
        {e.widget === "open" && (
          <small>
            {t(
              "Évaluation par barème, sans verdict automatique.",
              "Rubric-based evaluation, without an automatic verdict.",
            )}
          </small>
        )}
      </label>
    );
  return (
    <label>
      {e.widget === "set"
        ? t("Membres de l’ensemble", "Set members")
        : t("Numéros des productions", "Production numbers")}
      <input
        disabled={disabled}
        className="mono answer-input"
        aria-label="Your answer"
        value={typeof value === "string" ? value : ""}
        placeholder={e.widget === "set" ? "a, b, $" : "1, 2, 3"}
        onChange={(event) => onChange(event.target.value)}
      />
      <small>
        {e.widget === "set"
          ? t(
              "L’ordre des membres n’a pas d’importance. Séparer par des virgules.",
              "Set order does not matter. Separate members with commas.",
            )
          : t(
              "Respecter les numéros des productions et la direction demandée.",
              "Preserve production numbers and the requested direction.",
            )}
      </small>
    </label>
  );
}
function TreeAnswer({
  exercise: e,
  value,
  onChange,
  disabled,
}: {
  exercise: PublicExercise;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled: boolean;
}) {
  const { t } = useUI();
  const [rules, setRules] = useState<number[]>([]);
  const [error, setError] = useState("");
  const g = parseGrammar(e.grammar!);
  const d = derive(g, rules);
  const next = d.forms.at(-1)!.find((s) => g.nonterminals.includes(s));
  function apply(id: number) {
    try {
      const r = [...rules, id];
      const derivation = derive(g, r);
      setRules(r);
      onChange(derivation.tree);
      setError("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Invalid derivation.");
    }
  }
  return (
    <div>
      <div className="button-row">
        {!disabled &&
          g.productions
            .filter((p) => p.lhs === next)
            .map((p) => (
              <button
                key={p.id}
                className="button secondary mono"
                onClick={() => apply(p.id)}
              >
                <Plus size={14} />r{p.id}: {productionText(p)}
              </button>
            ))}
        {!disabled && (
          <button
            className="icon-button"
            aria-label="Reset tree answer"
            onClick={() => {
              setRules([]);
              onChange(null);
            }}
          >
            <RotateCcw size={15} />
          </button>
        )}
      </div>
      <p className="muted">
        {next
          ? t(
              "Développer le non-terminal gauche : ",
              "Expand the leftmost nonterminal: ",
            ) + next
          : t("Arbre terminé.", "Tree complete.")}
      </p>
      <TreeDiagram tree={disabled && value ? (value as Tree) : d.tree} />
      <ErrorBox message={error} />
    </div>
  );
}
function displayAnswer(answer: unknown): string {
  return typeof answer === "string" ? answer : JSON.stringify(answer, null, 2);
}
export function FeedbackPanel({ feedback: f }: { feedback: Feedback }) {
  const { t } = useUI();
  return (
    <div className={`feedback ${f.correct ? "correct" : "incorrect"}`}>
      <div className="panel-heading">
        <h3>
          {f.status === "needs_manual_review"
            ? t("Révision manuelle nécessaire", "Manual review needed")
            : f.correct
              ? t("Raisonnement validé.", "Answer verified.")
              : t("Une étape à reprendre.", "A step to revisit.")}
        </h3>
        <Badge tone={f.correct ? "green" : f.score === null ? "amber" : "blue"}>
          {f.score === null
            ? t("Non noté", "Not scored")
            : `${Math.round(f.score * 100)}%`}
        </Badge>
      </div>
      <div className="feedback-grid">
        <div>
          <div className="tiny-label">{t("VOTRE RÉPONSE", "YOUR ANSWER")}</div>
          <pre>{displayAnswer(f.answer ?? "—")}</pre>
        </div>
        <div>
          <div className="tiny-label">
            {t("RÉPONSE DE RÉFÉRENCE", "REFERENCE ANSWER")}
          </div>
          <pre>
            {f.expected === null
              ? t(
                  "Voir le barème et l’explication.",
                  "See rubric and explanation.",
                )
              : displayAnswer(f.expected)}
          </pre>
        </div>
      </div>
      {f.missing.length > 0 && (
        <p>
          <strong>{t("Manquants :", "Missing:")}</strong>{" "}
          <code>{f.missing.join(" ; ")}</code>
        </p>
      )}
      {f.extra.length > 0 && (
        <p>
          <strong>{t("En trop :", "Extra:")}</strong>{" "}
          <code>{f.extra.join(" ; ")}</code>
        </p>
      )}
      <h4>{t("Pourquoi", "Why")}</h4>
      <p className="pre-line">{f.why}</p>
      <details>
        <summary>{t("Voir le barème", "View rubric")}</summary>
        <p>{f.rubric}</p>
      </details>
    </div>
  );
}
export function PracticePage({ data }: { data: Bootstrap }) {
  const { t, preferences } = useUI();
  const router = useRouter();
  const [topic, setTopic] = useState("ll1");
  const [difficulty, setDifficulty] = useState(3);
  const [count, setCount] = useState(3);
  const [format, setFormat] = useState("");
  const [customGrammar, setCustomGrammar] = useState("");
  const [customTarget, setCustomTarget] = useState("");
  const [filter, setFilter] = useState("");
  const [exercises, setExercises] = useState(data.exercises);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const controller = useRef<AbortController | null>(null);
  async function start(id: string) {
    try {
      setError("");
      const r = await api<{ id: string }>({ op: "start", exerciseId: id });
      router.push("/practice/" + r.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed.");
    }
  }
  async function generate() {
    setBusy(true);
    setError("");
    controller.current = new AbortController();
    try {
      const r = await api<{ exercises: PublicExercise[]; mode: string }>(
        {
          op: "generate",
          topic,
          difficulty,
          count,
          type: format || undefined,
          grammar: topic === "ll1" && customGrammar ? customGrammar : undefined,
          target: customTarget || undefined,
          language: preferences.language,
        },
        controller.current.signal,
      );
      setExercises(r.exercises);
      setNotice(
        `${r.exercises.length} / ${count} ${t("exercices disponibles. ", "exercises available. ")}` +
          (r.mode === "nim-validated"
            ? t(
                "Questions originales validées par le solveur.",
                "Original questions validated by the solver.",
              )
            : t(
                "Banque vérifiée ou variantes déterministes ; aucune génération IA simulée.",
                "Verified bank or deterministic variants; no simulated AI generation.",
              )),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow={t("S’ENTRAÎNER AVEC MÉTHODE", "PRACTICE WITH A METHOD")}
        title={t("À vous de jouer.", "Your turn to work it out.")}
        description={t(
          "Une réponse, une vérification, puis la règle qui explique le résultat.",
          "An answer, a check, then the rule that explains the result.",
        )}
      />
      <section className="panel practice-builder">
        <div className="panel-heading">
          <h2>{t("Composer une séance", "Build a practice session")}</h2>
          <Badge tone="blue">
            {t("Banque & variantes vérifiées", "Verified bank & variants")}
          </Badge>
        </div>
        <div className="practice-controls">
          <label>
            {t("Chapitre", "Chapter")}
            <select
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                setFormat("");
              }}
            >
              <option value="">{t("Tous", "All")}</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {t(m.title, m.titleEn)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("Format", "Format")}
            <select value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="">{t("Tous", "All")}</option>
              {[
                ...new Set(
                  data.exercises
                    .filter((e) => !topic || e.topic === topic)
                    .map((e) => e.type),
                ),
              ].map((type) => (
                <option key={type} value={type}>
                  {type.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("Niveau", "Level")}
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} / 5
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("Quantité", "Count")}
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            >
              {[1, 3, 5, 10].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <button className="button primary" onClick={generate} disabled={busy}>
            {busy
              ? t("Préparation…", "Preparing…")
              : t("Préparer les exercices", "Prepare exercises")}
            <ArrowRight size={15} />
          </button>
          {busy && (
            <button
              className="button secondary"
              onClick={() => controller.current?.abort()}
            >
              {t("Annuler", "Cancel")}
            </button>
          )}
        </div>
        <p className="muted">
          {t(
            "FIRST/FOLLOW : variantes originales recalculées. Autres chapitres : sélection sans doublons dans la banque, limitée au contenu disponible. Le niveau sert à la génération ; les questions de la banque gardent leur niveau publié.",
            "FIRST/FOLLOW: recomputed original variants. Other chapters: unique bank selections, limited to available content. Level applies to generation; bank questions retain their published level.",
          )}
        </p>
        {topic === "ll1" && (
          <details className="syntax-help">
            <summary>
              {t(
                "Utiliser ma propre grammaire (FIRST/FOLLOW)",
                "Use my own grammar (FIRST/FOLLOW)",
              )}
            </summary>
            <label>
              {t("Grammaire optionnelle", "Optional grammar")}
              <textarea
                className="code-editor"
                rows={5}
                value={customGrammar}
                onChange={(e) => setCustomGrammar(e.target.value)}
                maxLength={4000}
              />
            </label>
            <label>
              {t(
                "Non-terminal cible (vide : tous)",
                "Target nonterminal (blank: all)",
              )}
              <input
                value={customTarget}
                onChange={(e) => setCustomTarget(e.target.value)}
                maxLength={30}
              />
            </label>
          </details>
        )}
        {notice && (
          <div className="notice" role="status">
            {notice}
          </div>
        )}
        <ErrorBox message={error} />
      </section>
      <div className="section-heading">
        <h2>{t("La banque d’exercices", "Exercise bank")}</h2>
        <input
          aria-label="Filter exercises"
          className="search-input"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t(
            "Chercher un type ou un titre…",
            "Search a type or title…",
          )}
        />
      </div>
      <div className="exercise-grid">
        {exercises
          .filter(
            (e) =>
              (!format || e.type === format) &&
              (e.title + " " + e.titleEn + " " + e.type)
                .toLowerCase()
                .includes(filter.toLowerCase()),
          )
          .map((e, i) => (
            <article className="exercise-card" key={e.id}>
              <div className="panel-heading">
                <span className="tiny-label">{e.topic.toUpperCase()}</span>
                <Badge>N{e.difficulty}</Badge>
              </div>
              <span className="exercise-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3>{t(e.title, e.titleEn)}</h3>
              <p>{t(e.statement, e.statementEn)}</p>
              <div className="exercise-card-footer">
                <span>{e.type.replaceAll("_", " ")}</span>
                <button className="text-button" onClick={() => start(e.id)}>
                  {t("Essayer", "Try it")}
                  <ArrowRight size={15} />
                </button>
              </div>
            </article>
          ))}
      </div>
    </>
  );
}
export function AttemptPage({
  id,
  onRefresh,
}: {
  id: string;
  onRefresh: () => void;
}) {
  const { t, preferences } = useUI();
  const { data, error, refresh } = useData<Attempt>(
    "/api/data?action=attempt&id=" + encodeURIComponent(id),
  );
  const [answer, setAnswer] = useState<unknown>("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [hint, setHint] = useState("");
  const [status, setStatus] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [advisory, setAdvisory] = useState("");
  const hydrated = useRef(false);
  const revision = useRef(0);
  const saved = useRef(0);
  const pending = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    if (data && !hydrated.current) {
      setAnswer(data.answer ?? "");
      setFeedback(data.feedback);
      hydrated.current = true;
    }
  }, [data]);
  useEffect(() => {
    if (
      !data ||
      feedback ||
      !hydrated.current ||
      saved.current === revision.current
    )
      return;
    const timer = setTimeout(() => {
      const version = revision.current;
      setStatus(t("Sauvegarde…", "Saving…"));
      pending.current = pending.current
        .catch(() => {})
        .then(() => api({ op: "draft", id, answer }))
        .then(() => {
          saved.current = version;
          setStatus(t("Brouillon sauvegardé", "Draft saved"));
        })
        .catch((e) =>
          setActionError(e instanceof Error ? e.message : "Save failed."),
        );
    }, 650);
    return () => clearTimeout(timer);
  }, [answer, id, data, feedback, t]);
  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;
  const e = data.exercise;
  async function submit() {
    setBusy(true);
    setActionError("");
    try {
      await pending.current;
      const f = await api<Feedback>({
        op: "submit",
        id,
        answer,
        language: preferences.language,
      });
      setFeedback(f);
      onRefresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Submission failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link className="back-link" href="/practice">
        <ArrowLeft size={14} />
        {t("Retour aux exercices", "Back to exercises")}
      </Link>
      <PageTitle
        eyebrow={`${e.topic.toUpperCase()} / ${e.type.replaceAll("_", " ")}`}
        title={t(e.title, e.titleEn)}
        description={t(
          "Travaillez à votre rythme. Votre brouillon est sauvegardé automatiquement.",
          "Work at your own pace. Your draft is saved automatically.",
        )}
      >
        <Badge>N{e.difficulty}</Badge>
      </PageTitle>
      <div className="attempt-layout">
        <section className="panel question-panel">
          <div className="panel-heading">
            <h2>{t("Énoncé", "Problem")}</h2>
            <span className="tiny-label">
              {e.provenance.includes("NVIDIA")
                ? "NIM + SOLVER"
                : "VERIFIED BANK"}
            </span>
          </div>
          <p className="question-statement">{t(e.statement, e.statementEn)}</p>
          {e.grammar && <pre className="grammar-block">{e.grammar}</pre>}
          {e.input && <pre className="input-block">w = {e.input}</pre>}
          <div className="answer-area">
            <div className="tiny-label">{t("VOTRE TOUR", "YOUR TURN")}</div>
            <AnswerWidget
              exercise={e}
              value={answer}
              onChange={(v) => {
                revision.current++;
                setAnswer(v);
              }}
              disabled={!!feedback}
            />
          </div>
          <ErrorBox message={actionError} />
          {!feedback ? (
            <div className="submission-bar">
              <span className="muted" role="status">
                <Save size={13} />
                {status ||
                  t(
                    "Le brouillon sera sauvegardé après votre saisie.",
                    "Your draft saves after you enter an answer.",
                  )}
              </span>
              <button
                className="button primary"
                onClick={submit}
                disabled={busy}
              >
                <Check size={15} />
                {busy
                  ? t("Vérification…", "Checking…")
                  : t("Vérifier ma réponse", "Check my answer")}
              </button>
            </div>
          ) : (
            <>
              <FeedbackPanel feedback={feedback} />
              {feedback.status === "needs_manual_review" && (
                <>
                  <button
                    className="button secondary"
                    onClick={async () => {
                      try {
                        const r = await api<{
                          feedback: string;
                          suggestedScore: number;
                          uncertainty: string;
                        }>({ op: "aiGrade", id });
                        setAdvisory(
                          `${r.feedback}\n${t("Score conseillé", "Advisory score")}: ${Math.round(r.suggestedScore * 100)}%\n${r.uncertainty}`,
                        );
                      } catch (e) {
                        setActionError(
                          e instanceof Error ? e.message : "AI unavailable.",
                        );
                      }
                    }}
                  >
                    {t("Demander un avis IA", "Request AI advice")}
                  </button>
                  {advisory && (
                    <div className="notice pre-line">{advisory}</div>
                  )}
                </>
              )}
              <div className="button-row">
                <Link
                  href={`/practice?topic=${e.topic}`}
                  className="button primary"
                >
                  {t("Continuer à s’entraîner", "Continue practicing")}
                  <ArrowRight size={15} />
                </Link>
                <Link
                  href={`/tutor?grammar=${encodeURIComponent(e.grammar ?? "")}`}
                  className="button secondary"
                >
                  {t("Comprendre avec le tuteur", "Discuss with the tutor")}
                </Link>
              </div>
            </>
          )}
        </section>
        <aside className="output-column">
          <section className="panel">
            <div className="panel-heading">
              <h3>
                <Lightbulb size={16} />
                {t("Un coup de pouce", "A little guidance")}
              </h3>
              <Badge>{data.hintLevel}/3</Badge>
            </div>
            <p className="muted">
              {t(
                "Un indice vous remet sur la voie sans remplacer votre raisonnement.",
                "A hint guides your next step without replacing your reasoning.",
              )}
            </p>
            <button
              className="button secondary full"
              onClick={async () => {
                try {
                  const r = await api<{ hint: string; level: number }>({
                    op: "hint",
                    id,
                  });
                  setHint(r.hint);
                  await refresh();
                } catch (e) {
                  setActionError(
                    e instanceof Error ? e.message : "Hint unavailable.",
                  );
                }
              }}
            >
              <Lightbulb size={14} />
              {t("Voir un indice", "Show a hint")}
            </button>
            {hint && <div className="hint-text">{hint}</div>}
          </section>
          <section className="method-note">
            <span>→ {t("LA MÉTHODE", "THE METHOD")}</span>
            <p>{e.rubric}</p>
          </section>
        </aside>
      </div>
    </>
  );
}
export function ExamsPage({ data }: { data: Bootstrap }) {
  const { t } = useUI();
  const router = useRouter();
  const [minutes, setMinutes] = useState(30);
  const [topic, setTopic] = useState("");
  const [practice, setPractice] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <PageTitle
        eyebrow={t(
          "PRÉPARATION / CONDITIONS RÉELLES",
          "PREPARATION / EXAM CONDITIONS",
        )}
        title={t(
          "Faire le point, sans raccourci.",
          "Test your method, end to end.",
        )}
        description={t(
          "Un temps défini, un brouillon sauvegardé et une correction après la soumission.",
          "A defined duration, saved drafts and feedback after submission.",
        )}
      />
      <section className="panel">
        <h2>{t("Préparer une séance", "Prepare a session")}</h2>
        <div className="practice-controls">
          <label>
            {t("Durée", "Duration")}
            <select
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
            >
              {[15, 30, 60, 90].map((n) => (
                <option key={n} value={n}>
                  {n} min
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("Chapitre", "Chapter")}
            <select value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option value="">{t("TD mixte", "Mixed tutorial")}</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {t(m.title, m.titleEn)}
                </option>
              ))}
            </select>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={practice}
              onChange={(e) => setPractice(e.target.checked)}
            />
            {t("Mode pratique", "Practice mode")}
          </label>
          <button
            className="button primary"
            onClick={async () => {
              try {
                const r = await api<{ id: string }>({
                  op: "examStart",
                  minutes,
                  topic,
                  practice,
                });
                router.push("/exams/" + r.id);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Cannot start exam.");
              }
            }}
          >
            {t("Commencer la séance", "Start session")}
            <ArrowRight size={15} />
          </button>
        </div>
        <p className="muted">
          {t(
            "Le minuteur indique le temps écoulé et ne supprime jamais vos réponses. En examen, le tuteur est verrouillé jusqu’à la soumission. Les questions ouvertes sont réservées à la pratique avec barème.",
            "The timer reports elapsed time and never deletes answers. In exam mode, tutor assistance is locked until submission. Open questions are reserved for rubric-based practice.",
          )}
        </p>
        <ErrorBox message={error} />
      </section>
      <h2 className="section-title">{t("Mes séances", "My sessions")}</h2>
      {data.exams.length ? (
        <div className="panel table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t("Séance", "Session")}</th>
                <th>{t("Durée", "Duration")}</th>
                <th>{t("État", "Status")}</th>
                <th>Score</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.exams.map((e) => (
                <tr key={e.id}>
                  <td>{e.title}</td>
                  <td>{e.minutes} min</td>
                  <td>
                    <Badge tone={e.status === "submitted" ? "green" : "amber"}>
                      {e.status}
                    </Badge>
                  </td>
                  <td>
                    {e.score === null ? "—" : `${Math.round(e.score * 100)}%`}
                  </td>
                  <td>
                    <Link className="text-link" href={"/exams/" + e.id}>
                      {e.status === "submitted"
                        ? t("Revoir", "Review")
                        : t("Reprendre", "Resume")}
                      <ArrowRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title={t(
            "Votre première séance vous attend",
            "Your first session awaits",
          )}
          text={t(
            "Choisissez une durée et un chapitre pour commencer.",
            "Choose a duration and chapter to begin.",
          )}
        />
      )}
    </>
  );
}
export function ExamPage({
  id,
  onRefresh,
}: {
  id: string;
  onRefresh: () => void;
}) {
  const { t, preferences } = useUI();
  const { data, error, refresh } = useData<Exam>(
    "/api/data?action=exam&id=" + encodeURIComponent(id),
  );
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [now, setNow] = useState(Date.now());
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [dirty, setDirty] = useState(false);
  const hydrated = useRef(false);
  useEffect(() => {
    if (data && !hydrated.current) {
      setAnswers(data.answers);
      hydrated.current = true;
    }
  }, [data]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!data || data.status === "submitted" || !dirty) return;
    const timer = setTimeout(() => {
      void api({ op: "examSave", id, answers })
        .then(() => {
          setStatus(t("Brouillon sauvegardé", "Draft saved"));
          setDirty(false);
        })
        .catch((e) =>
          setActionError(e instanceof Error ? e.message : "Save failed."),
        );
    }, 700);
    return () => clearTimeout(timer);
  }, [answers, id, data, dirty, t]);
  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;
  const submitted = data.status === "submitted";
  const remaining = Math.max(
    0,
    data.minutes * 60000 - (now - new Date(data.createdAt).getTime()),
  );
  return (
    <>
      <Link href="/exams" className="back-link">
        <ArrowLeft size={14} />
        {t("Mes examens", "My exams")}
      </Link>
      <PageTitle
        title={data.title}
        description={t(
          "Les réponses restent disponibles après le temps prévu. Soumettez pour voir la correction.",
          "Answers remain available after the planned time. Submit to see feedback.",
        )}
      >
        <Badge tone={remaining ? "blue" : "amber"}>
          {submitted
            ? `${Math.round((data.score ?? 0) * 100)}%`
            : `${Math.floor(remaining / 60000)}:${String(Math.floor(remaining / 1000) % 60).padStart(2, "0")}`}
        </Badge>
      </PageTitle>
      {!remaining && !submitted && (
        <div className="notice warning">
          {t(
            "Temps prévu écoulé. Vos réponses sont conservées ; vous pouvez soumettre.",
            "Planned time elapsed. Your answers are retained; you can submit.",
          )}
        </div>
      )}
      <ErrorBox message={actionError} />
      {data.exercises.map((e, i) => (
        <section key={e.id} className="panel exam-question">
          <div className="panel-heading">
            <h2>
              {String(i + 1).padStart(2, "0")} · {t(e.title, e.titleEn)}
            </h2>
            <Badge>{e.topic}</Badge>
          </div>
          <p>{t(e.statement, e.statementEn)}</p>
          {e.grammar && <pre className="grammar-block">{e.grammar}</pre>}
          {e.input && <pre>{e.input}</pre>}
          <AnswerWidget
            exercise={e}
            value={answers[e.id]}
            onChange={(v) => {
              setAnswers({ ...answers, [e.id]: v });
              setDirty(true);
            }}
            disabled={submitted}
          />
          {data.practice && !submitted && (
            <details>
              <summary>
                <Lightbulb size={14} />
                {t("Indice", "Hint")}
              </summary>
              <p>{e.hints[0]}</p>
            </details>
          )}
          {submitted && data.feedback?.find((f) => f.id === e.id) && (
            <FeedbackPanel
              feedback={data.feedback.find((f) => f.id === e.id)!}
            />
          )}
        </section>
      ))}
      {!submitted && (
        <div className="exam-submit">
          <span role="status">
            <Save size={14} />
            {status}
          </span>
          <button
            disabled={busy}
            className="button primary"
            onClick={async () => {
              if (
                !window.confirm(
                  t(
                    "Soumettre cette séance et afficher la correction ?",
                    "Submit this session and reveal feedback?",
                  ),
                )
              )
                return;
              setBusy(true);
              try {
                await api({
                  op: "examSubmit",
                  id,
                  answers,
                  language: preferences.language,
                });
                await refresh();
                onRefresh();
              } catch (e) {
                setActionError(
                  e instanceof Error ? e.message : "Submit failed.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <Send size={15} />
            {t("Soumettre la séance", "Submit session")}
          </button>
        </div>
      )}
    </>
  );
}
