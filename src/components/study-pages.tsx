"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Clock,
  Bookmark,
  FlaskConical,
  ChevronRight,
  Target,
  ArrowLeft,
  Download,
  Trash2,
} from "lucide-react";
import katex from "katex";
import { Bootstrap, api, Preferences, defaultPreferences } from "@/lib/client";
import { modules } from "@/lib/courses";
import { useUI } from "./providers";
import { Badge, Empty, ErrorBox, PageTitle, ProgressBar } from "./ui";
import { Logo, Controls } from "./shell";
function metrics(data: Bootstrap) {
  const attempts = data?.attempts ?? [];
  const scored = attempts.filter((a) => a && a.score !== null && a.submittedAt);
  const byTopic = modules.map((m) => {
    const items = scored.filter((a) => a.exercise?.topic === m.id).slice(0, 10);
    const total = items.reduce((s, _, i) => s + 1 / (i + 1), 0);
    return {
      id: m.id,
      title: m.title,
      titleEn: m.titleEn,
      count: items.length,
      score: items.length
        ? items.reduce((s, a, i) => s + a.score! / (i + 1), 0) / (total || 1)
        : null,
    };
  });
  const completed = (data?.progress ?? []).filter((p) => p?.completed).length;
  return { scored, byTopic, completed };
}
export function Dashboard({ data }: { data: Bootstrap }) {
  const { t, preferences } = useUI();
  const { scored, byTopic, completed } = metrics(data);
  const lessons = data?.lessons ?? [];
  const progress = data?.progress ?? [];
  const userName = data?.user?.name || "Étudiant";
  const next = modules
    .flatMap((m) => m.lessons.map((l) => ({ ...l, moduleId: m.id })))
    .find(
      (l) =>
        lessons.some((p) => p.id === l.id) &&
        !progress.some((p) => p.lessonId === l.id && p.completed),
    );
  const weak = byTopic
    .filter((m) => m.score !== null)
    .sort((a, b) => a.score! - b.score!)[0];
  const correct = scored.filter((a) => a.score === 1).length;
  return (
    <>
      <PageTitle
        eyebrow={t("VOTRE ESPACE D’APPRENTISSAGE", "YOUR LEARNING WORKSPACE")}
        title={t(
          `Bonjour, ${userName.split(" ")[0] || "Étudiant"}.`,
          `Hello, ${userName.split(" ")[0] || "Student"}.`,
        )}
        description={t(
          "Un peu de méthode aujourd’hui. Un peu plus de clarté demain.",
          "A little method today. A little more clarity tomorrow.",
        )}
      >
        <Link className="button secondary" href="/practice">
          <Target size={15} />
          {t("Ma séance du jour", "Today’s practice")}
        </Link>
      </PageTitle>
      <div className="dashboard-top">
        <section className="continue-card">
          <div className="continue-content">
            <span className="eyebrow">
              {t("REPRENDRE LE FIL", "PICK UP THE THREAD")}
            </span>
            <Badge tone="blue">
              {next
                ? modules.find((m) => m.id === next.moduleId)?.title
                : t("Parcours terminé", "Path completed")}
            </Badge>
            <h2>
              {next
                ? t(next.title, next.titleEn)
                : t("À vous de consolider.", "Time to consolidate.")}
            </h2>
            <p>
              {next
                ? t(next.content.outcomes[0], next.content.outcomesEn[0])
                : t(
                    "Choisissez un entraînement ciblé pour transformer vos acquis en réflexes.",
                    "Choose targeted practice to turn what you know into a reliable method.",
                  )}
            </p>
            <Link
              href={next ? `/learn/${next.moduleId}/${next.slug}` : "/practice"}
              className="button primary"
            >
              {t("Continuer à apprendre", "Continue learning")}
              <ArrowRight size={16} />
            </Link>
            <div className="continue-meta">
              <Clock size={13} />
              {next?.duration ?? preferences.minutes} min <span>·</span>
              {t("À votre rythme", "At your pace")}
            </div>
          </div>
          <div className="continue-illustration" aria-hidden="true">
            <span>G = (N, T, P, S)</span>
            <div className="formula-node">S</div>
            <div className="formula-branches">╱　　　╲</div>
            <div className="formula-leaves">
              <i>A</i>
              <i>b</i>
            </div>
            <div className="formula-bottom">S ⇒ A b ⇒ a b</div>
          </div>
        </section>
        <section className="panel daily-card">
          <div className="panel-heading">
            <span className="eyebrow">
              {t("L’OBJECTIF DU JOUR", "TODAY’S GOAL")}
            </span>
            <Target size={18} />
          </div>
          <div className="goal-number">
            {preferences.minutes}
            <span>min</span>
          </div>
          <h3>
            {t("Un créneau pour comprendre.", "Make time to understand.")}
          </h3>
          <p className="muted">
            {t(
              "Votre objectif personnel. Le temps de lecture n’est pas mesuré automatiquement.",
              "Your personal target. Reading time is not automatically measured.",
            )}
          </p>
          <Link href="/settings" className="text-link">
            {t("Adapter mon objectif", "Adjust my goal")}
            <ArrowUpRight size={14} />
          </Link>
        </section>
      </div>
      <div className="stats-grid">
        <div className="stat">
          <span>{t("Leçons terminées", "Completed lessons")}</span>
          <strong>
            {completed}
            <small>/ {data.lessons.length}</small>
          </strong>
          <ProgressBar
            value={completed / data.lessons.length}
            label="Lesson completion"
          />
        </div>
        <div className="stat">
          <span>{t("Exercices évalués", "Scored exercises")}</span>
          <strong>{scored.length}</strong>
          <small>
            {t(
              "À partir de vos réponses soumises",
              "Based on submitted answers",
            )}
          </small>
        </div>
        <div className="stat">
          <span>{t("Réponses exactes", "Exact answers")}</span>
          <strong>
            {scored.length
              ? `${Math.round((correct / scored.length) * 100)}%`
              : "—"}
          </strong>
          <small>
            {scored.length
              ? `${correct} / ${scored.length}`
              : t("Commencez un premier exercice", "Try your first exercise")}
          </small>
        </div>
        <div className="stat">
          <span>{t("Préparation à l’examen", "Exam preparation")}</span>
          <strong>
            {data.exams.filter((e) => e.status === "submitted").length}
            <small>{t("séances", "sessions")}</small>
          </strong>
          <small>
            {t(
              "Une activité observée, pas une prédiction",
              "Observed activity, not a grade prediction",
            )}
          </small>
        </div>
      </div>
      <div className="dashboard-bottom">
        <section className="panel">
          <div className="panel-heading">
            <h2>{t("Votre parcours", "Your learning path")}</h2>
            <Link href="/learn" className="text-link">
              {t("Tout voir", "View all")}
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="dashboard-modules">
            {modules.slice(0, 5).map((m, i) => {
              const done = m.lessons.filter((l) =>
                data.progress.some((p) => p.lessonId === l.id && p.completed),
              ).length;
              return (
                <Link href={"/learn?module=" + m.id} key={m.id}>
                  <span
                    className={`module-step ${done === m.lessons.length ? "done" : ""}`}
                  >
                    {done === m.lessons.length ? (
                      <Check size={15} />
                    ) : (
                      String(i + 1).padStart(2, "0")
                    )}
                  </span>
                  <div>
                    <strong>{t(m.title, m.titleEn)}</strong>
                    <small>
                      {done} / {m.lessons.length}{" "}
                      {t("leçons terminées", "lessons complete")}
                    </small>
                  </div>
                  <ChevronRight size={15} />
                </Link>
              );
            })}
          </div>
        </section>
        <div className="output-column">
          <section className="panel recommendation">
            <div className="eyebrow">{t("PROCHAIN PAS", "NEXT STEP")}</div>
            <h3>
              {weak
                ? t(weak.title, weak.titleEn)
                : t("Commencer par les bases.", "Start with the foundations.")}
            </h3>
            <p>
              {weak
                ? t(
                    `${weak.count} réponse(s) évaluée(s) dans ce chapitre. Revoyez les erreurs avant de passer à la suite.`,
                    `${weak.count} scored answer(s) in this chapter. Review errors before moving on.`,
                  )
                : t(
                    "Vos recommandations apparaîtront à partir de vos réponses réelles. Pour commencer, distinguez lexème et token.",
                    "Recommendations will use your actual answers. Begin by distinguishing lexemes from tokens.",
                  )}
            </p>
            <Link
              href={weak ? "/review" : "/learn/introduction/lexeme-token"}
              className="text-link"
            >
              {weak
                ? t("Revoir mes erreurs", "Review my errors")
                : t("Ouvrir la leçon", "Open the lesson")}
              <ArrowRight size={14} />
            </Link>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <h3>{t("Dernière activité", "Recent activity")}</h3>
              <Badge>{data.events.length}</Badge>
            </div>
            {data.events.length ? (
              <div className="activity-list">
                {data.events.slice(0, 4).map((e) => (
                  <div key={e.id}>
                    <span className="activity-dot" />
                    <div>
                      <strong>
                        {e.type === "lesson_completed"
                          ? t("Leçon terminée", "Lesson completed")
                          : e.type === "exam_submitted"
                            ? t("Séance soumise", "Session submitted")
                            : t("Exercice soumis", "Exercise submitted")}
                      </strong>
                      <small>
                        {e.topic} ·{" "}
                        {new Date(e.createdAt).toLocaleDateString(
                          preferences.language,
                        )}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">
                {t(
                  "Votre première activité apparaîtra ici.",
                  "Your first activity will appear here.",
                )}
              </p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
export function Learn({ data }: { data: Bootstrap }) {
  const { t } = useUI();
  const [query, setQuery] = useState("");
  const [module, setModule] = useState("");
  useEffect(() => {
    setModule(new URLSearchParams(location.search).get("module") ?? "");
  }, []);
  return (
    <>
      <PageTitle
        eyebrow={t(
          "LE PARCOURS / L3 COMPILATION",
          "LEARNING PATH / L3 COMPILATION",
        )}
        title={t(
          "Des fondations aux états LR.",
          "From foundations to LR states.",
        )}
        description={t(
          "Des cours détaillés, des exemples résolus étape par étape et un laboratoire pour chaque méthode. Accès libre, sans connexion.",
          "Detailed lessons, step-by-step worked examples and a lab for every method. Open access, no login required.",
        )}
      />
      <div className="lab-switcher" aria-label="LR parsing methods">
        {[
          ["LR0", "LR(0)"],
          ["SLR", "SLR(1)"],
          ["LR1", "LR(1)"],
          ["LALR", "LALR(1)"],
        ].map(([method, label]) => (
          <Link key={method} href={`/lab/lr?method=${method}`}>
            {label}
          </Link>
        ))}
      </div>
      <div className="course-filters">
        <input
          aria-label="Search lessons"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(
            "Chercher une leçon, un concept…",
            "Find a lesson or concept…",
          )}
        />
        <select
          aria-label="Filter modules"
          value={module}
          onChange={(e) => setModule(e.target.value)}
        >
          <option value="">{t("Tous les chapitres", "All chapters")}</option>
          {modules.map((m) => (
            <option key={m.id} value={m.id}>
              {t(m.title, m.titleEn)}
            </option>
          ))}
        </select>
      </div>
      <div className="course-grid">
        {modules
          .filter((m) => !module || m.id === module)
          .map((m, i) => {
            const lessons = data.lessons.filter(
              (l) =>
                l.moduleId === m.id &&
                (l.title + " " + l.titleEn)
                  .toLowerCase()
                  .includes(query.toLowerCase()),
            );
            if (!lessons.length) return null;
            const done = data.progress.filter(
              (p) => p.completed && m.lessons.some((l) => l.id === p.lessonId),
            ).length;
            return (
              <article key={m.id} className="module-card">
                <div className="panel-heading">
                  <span className="module-number">
                    {String(modules.indexOf(m) + 1 || i + 1).padStart(2, "0")}
                  </span>
                  <Badge>
                    {m.lessons.reduce((s, l) => s + l.duration, 0)} min
                  </Badge>
                </div>
                <h2>{t(m.title, m.titleEn)}</h2>
                <p>{t(m.description, m.descriptionEn)}</p>
                <ProgressBar value={done / m.lessons.length} label={m.title} />
                <div className="lesson-list">
                  {lessons.map((l) => (
                    <Link key={l.id} href={`/learn/${m.id}/${l.slug}`}>
                      <span
                        className={`lesson-check ${data.progress.some((p) => p.lessonId === l.id && p.completed) ? "complete" : ""}`}
                      >
                        {data.progress.some(
                          (p) => p.lessonId === l.id && p.completed,
                        ) ? (
                          <Check size={12} />
                        ) : (
                          <BookOpen size={12} />
                        )}
                      </span>
                      <span>{t(l.title, l.titleEn)}</span>
                      <small>{l.duration}m</small>
                      <ChevronRight size={13} />
                    </Link>
                  ))}
                </div>
              </article>
            );
          })}
      </div>
    </>
  );
}
export function LessonPage({
  data,
  moduleId,
  slug,
  onRefresh,
}: {
  data: Bootstrap;
  moduleId: string;
  slug: string;
  onRefresh: () => void;
}) {
  const { t, preferences } = useUI();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const lesson = data.lessons.find(
    (l) => l.moduleId === moduleId && l.slug === slug,
  );
  if (!lesson)
    return (
      <Empty
        title={t("Leçon indisponible", "Lesson unavailable")}
        text={t(
          "Cette leçon est absente ou non publiée.",
          "This lesson is missing or unpublished.",
        )}
        href="/learn"
        label={t("Revenir au parcours", "Back to the path")}
      />
    );
  const c = lesson.content;
  const complete = data.progress.some(
    (p) => p.lessonId === lesson.id && p.completed,
  );
  const saved = data.bookmarks.some((b) => b.lessonId === lesson.id);
  const ordered = modules.flatMap((m) =>
    m.lessons.map((l) => ({ moduleId: m.id, ...l })),
  );
  const next = ordered[ordered.findIndex((l) => l.id === lesson.id) + 1];
  const math = katex.renderToString("G = (N, T, P, S)", {
    throwOnError: false,
  });
  return (
    <>
      <Link href="/learn" className="back-link">
        <ArrowLeft size={14} />
        {t("Le parcours", "Learning path")}
      </Link>
      <PageTitle
        eyebrow={t(
          modules.find((m) => m.id === moduleId)!.title,
          modules.find((m) => m.id === moduleId)!.titleEn,
        ).toUpperCase()}
        title={t(lesson.title, lesson.titleEn)}
        description={`${lesson.duration} min · ${t("Théorie, exemple, pratique", "Theory, example, practice")}`}
      >
        <button
          className={`button secondary ${saved ? "saved" : ""}`}
          onClick={async () => {
            try {
              await api({ op: "bookmark", lessonId: lesson.id });
              onRefresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Bookmark failed.");
            }
          }}
        >
          <Bookmark size={15} fill={saved ? "currentColor" : "none"} />
          {saved
            ? t("Dans mes favoris", "Bookmarked")
            : t("Garder cette leçon", "Bookmark lesson")}
        </button>
      </PageTitle>
      <div className="lesson-layout">
        <article className="panel lesson-article">
          <div className="lesson-outcomes">
            <div className="eyebrow">
              {t("À LA FIN DE CETTE LEÇON", "AFTER THIS LESSON")}
            </div>
            {(preferences.language === "fr" ? c.outcomes : c.outcomesEn).map(
              (outcome) => (
                <div key={outcome}>
                  <Check size={15} />
                  {outcome}
                </div>
              ),
            )}
          </div>
          {lesson.id === "definition-g" && (
            <div
              className="math-display"
              dangerouslySetInnerHTML={{ __html: math }}
            />
          )}
          {c.sections.map((s, i) => (
            <section id={"section-" + i} key={i}>
              <span className="tiny-label">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2>{t(s.heading, s.headingEn)}</h2>
              <p>{t(s.text, s.textEn)}</p>
              {s.table && (
                <div className="table-scroll" style={{ margin: "16px 0" }}>
                  <table>
                    <thead>
                      <tr>
                        {(preferences.language === "en" && s.table.headersEn
                          ? s.table.headersEn
                          : s.table.headers
                        ).map((h, hi) => (
                          <th key={hi}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {s.table.rows.map((row, ri) => (
                        <tr key={ri}>
                          {row.map((cell, ci) => (
                            <td key={ci}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {s.example && <pre className="worked-example">{s.example}</pre>}
            </section>
          ))}
          <div className="pitfall">
            <strong>{t("L’erreur à éviter", "A common mistake")}</strong>
            <p>{t(c.pitfall, c.pitfallEn)}</p>
          </div>
          {c.source && (
            <p className="source-note">
              {t(
                "Contexte d’étude : conversation antérieure",
                "Study context: prior conversation",
              )}{" "}
              · {c.source.id} · p. {c.source.page}.{" "}
              {t(
                "Les résultats formels sont recalculés ; le transcript n’est pas une autorité.",
                "Formal results are recomputed; the transcript is not an authority.",
              )}
            </p>
          )}
          <div className="lesson-actions">
            <button
              className="button primary"
              onClick={async () => {
                try {
                  await api({ op: "complete", lessonId: lesson.id });
                  setMessage(
                    t(
                      "Leçon terminée. Votre progression a été enregistrée.",
                      "Lesson complete. Your progress is saved.",
                    ),
                  );
                  onRefresh();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Save failed.");
                }
              }}
              disabled={complete}
            >
              <Check size={15} />
              {complete
                ? t("Leçon terminée", "Lesson complete")
                : t("Marquer comme terminée", "Mark complete")}
            </button>
            {next && (
              <Link
                className="button secondary"
                href={`/learn/${next.moduleId}/${next.slug}`}
              >
                {t("Leçon suivante", "Next lesson")}
                <ArrowRight size={15} />
              </Link>
            )}
          </div>
          {message && (
            <div className="notice" role="status">
              {message}
            </div>
          )}
          <ErrorBox message={error} />
        </article>
        <aside className="lesson-aside">
          <section className="panel">
            <div className="eyebrow">
              {t("DANS CETTE LEÇON", "IN THIS LESSON")}
            </div>
            {c.sections.map((s, i) => (
              <a href={"#section-" + i} key={i} className="toc-item">
                {String(i + 1).padStart(2, "0")}
                <span>{t(s.heading, s.headingEn)}</span>
              </a>
            ))}
          </section>
          <section className="panel">
            <h3>{t("Le vocabulaire", "Vocabulary")}</h3>
            <dl className="glossary">
              {Object.entries(c.vocabulary).map(([fr, en]) => (
                <div key={fr}>
                  <dt>{fr}</dt>
                  <dd>{en}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="sandbox-card">
            <FlaskConical size={22} />
            <h3>{t("Maintenant, manipulez.", "Now explore it yourself.")}</h3>
            <p>
              {t(
                "Ouvrez cet exemple dans le laboratoire et suivez le calcul.",
                "Open this example in the lab and follow the computation.",
              )}
            </p>
            <Link
              className="button primary full"
              href={
                c.lab +
                (c.grammar ? "?grammar=" + encodeURIComponent(c.grammar) : "")
              }
            >
              {t("Ouvrir le laboratoire", "Open laboratory")}
              <ArrowUpRight size={14} />
            </Link>
          </section>
          <Link
            href={
              "/tutor?grammar=" +
              encodeURIComponent(c.grammar ?? "") +
              "&question=" +
              encodeURIComponent(
                t("Expliquer cette leçon : ", "Explain this lesson: ") +
                  lesson.title,
              )
            }
            className="tutor-link"
          >
            {t(
              "Expliquer une étape avec le tuteur",
              "Explain a step with the tutor",
            )}
            <ArrowRight size={14} />
          </Link>
          <Link href={"/practice?topic=" + moduleId} className="text-link">
            {t("Essayer un exercice", "Try an exercise")}
            <ArrowRight size={14} />
          </Link>
        </aside>
      </div>
    </>
  );
}
export function Review({ data }: { data: Bootstrap }) {
  const { t } = useUI();
  const mistakes = data.attempts.filter((a) => a.score !== null && a.score < 1);
  const grouped = Object.entries(
    Object.groupBy(mistakes, (a) => a.exercise.type),
  );
  const bookmarks = data.lessons.filter((l) =>
    data.bookmarks.some((b) => b.lessonId === l.id),
  );
  return (
    <>
      <PageTitle
        eyebrow={t("RÉVISER / CONSOLIDER", "REVIEW / CONSOLIDATE")}
        title={t(
          "Les erreurs deviennent des repères.",
          "Turn mistakes into a method.",
        )}
        description={t(
          "Revenir aux règles qui ont posé problème, à partir de vos vraies réponses.",
          "Revisit rules that caused difficulty, using your actual answers.",
        )}
      />
      <div className="two-column">
        <section className="panel">
          <div className="panel-heading">
            <h2>{t("Mes erreurs fréquentes", "My common mistakes")}</h2>
            <Badge>{mistakes.length}</Badge>
          </div>
          {grouped.length ? (
            grouped.map(([type, items]) => (
              <div className="mistake-group" key={type}>
                <div className="panel-heading">
                  <h3>{type.replaceAll("_", " ")}</h3>
                  <Badge tone="amber">{items!.length}</Badge>
                </div>
                {items!.slice(0, 5).map((a) => (
                  <Link
                    key={a.id}
                    href={"/practice/" + a.id}
                    className="review-row"
                  >
                    <span>{t(a.exercise.title, a.exercise.titleEn)}</span>
                    <Badge>{Math.round((a.score ?? 0) * 100)}%</Badge>
                    <ArrowRight size={14} />
                  </Link>
                ))}
              </div>
            ))
          ) : (
            <Empty
              title={t(
                "Pas encore d’erreur à revoir",
                "No mistakes to review yet",
              )}
              text={t(
                "Les réponses partiellement correctes apparaîtront ici.",
                "Partly correct answers will appear here.",
              )}
              href="/practice"
              label={t("Commencer un exercice", "Start an exercise")}
            />
          )}
        </section>
        <div className="output-column">
          <section className="panel">
            <div className="panel-heading">
              <h2>{t("Leçons en favoris", "Bookmarked lessons")}</h2>
              <Bookmark size={17} />
            </div>
            {bookmarks.length ? (
              bookmarks.map((l) => (
                <Link
                  className="review-row"
                  key={l.id}
                  href={`/learn/${l.moduleId}/${l.slug}`}
                >
                  {t(l.title, l.titleEn)}
                  <ArrowRight size={14} />
                </Link>
              ))
            ) : (
              <p className="muted">
                {t(
                  "Utilisez « Garder cette leçon » dans le cours.",
                  "Use “Bookmark lesson” while reading.",
                )}
              </p>
            )}
          </section>
          <section className="panel">
            <h3>{t("Brouillons à reprendre", "Drafts to resume")}</h3>
            {data.attempts
              .filter((a) => !a.submittedAt)
              .slice(0, 5)
              .map((a) => (
                <Link
                  key={a.id}
                  href={"/practice/" + a.id}
                  className="review-row"
                >
                  {t(a.exercise.title, a.exercise.titleEn)}
                  <ArrowRight size={14} />
                </Link>
              ))}
            {!data.attempts.some((a) => !a.submittedAt) && (
              <p className="muted">
                {t("Aucun brouillon en cours.", "No drafts in progress.")}
              </p>
            )}
          </section>
          <Link className="button primary" href="/practice">
            {t(
              "Préparer une pratique corrective",
              "Prepare corrective practice",
            )}
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </>
  );
}
export function Progress({ data }: { data: Bootstrap }) {
  const { t, preferences } = useUI();
  const { byTopic, scored } = metrics(data);
  const recent = [...scored].reverse().slice(-20);
  const points = recent
    .map(
      (a, i) =>
        `${30 + i * (540 / Math.max(1, recent.length - 1))},${150 - (a.score ?? 0) * 120}`,
    )
    .join(" ");
  return (
    <>
      <PageTitle
        eyebrow={t(
          "PROGRESSION / DES PREUVES, PAS DES PRÉDICTIONS",
          "PROGRESS / EVIDENCE, NOT PREDICTIONS",
        )}
        title={t("Voir ce qui se consolide.", "See what is taking shape.")}
        description={t(
          "Maîtrise indicative : moyenne pondérée des 10 dernières réponses du chapitre, poids 1/rang. Aucune donnée fictive.",
          "Indicative mastery: weighted mean of the latest 10 answers per chapter, weight 1/rank. No invented data.",
        )}
      />
      <div className="two-column">
        <section className="panel">
          <h2>{t("Par chapitre", "By chapter")}</h2>
          {byTopic.map((m) => (
            <div className="mastery-row" key={m.id}>
              <div>
                <strong>{t(m.title, m.titleEn)}</strong>
                <span>
                  {m.score === null ? "—" : Math.round(m.score * 100) + "%"}
                </span>
              </div>
              <ProgressBar value={m.score ?? 0} label={m.title} />
              <small>
                {m.count
                  ? `${m.count} ${t("réponses évaluées", "scored answers")}`
                  : t("Aucune preuve disponible", "No evidence yet")}
              </small>
            </div>
          ))}
        </section>
        <section className="panel">
          <h2>{t("Les dernières réponses", "Recent answers")}</h2>
          {recent.length >= 2 ? (
            <>
              <svg
                className="trend-chart"
                viewBox="0 0 600 180"
                role="img"
                aria-label="Scores of recent submitted exercises"
              >
                <line
                  x1="30"
                  y1="150"
                  x2="570"
                  y2="150"
                  stroke="var(--border)"
                />
                <line
                  x1="30"
                  y1="30"
                  x2="570"
                  y2="30"
                  stroke="var(--border)"
                  strokeDasharray="4 4"
                />
                <text x="2" y="35" fill="var(--muted)" fontSize="10">
                  100
                </text>
                <text x="12" y="155" fill="var(--muted)" fontSize="10">
                  0
                </text>
                <polyline
                  points={points}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2"
                />
                {recent.map((a, i) => (
                  <circle
                    key={a.id}
                    cx={30 + i * (540 / Math.max(1, recent.length - 1))}
                    cy={150 - (a.score ?? 0) * 120}
                    r="4"
                    fill="var(--accent)"
                  >
                    <title>
                      {a.exercise.title}: {Math.round((a.score ?? 0) * 100)}%
                    </title>
                  </circle>
                ))}
              </svg>
              <p className="muted">
                {t(
                  "Chaque point correspond à une réponse soumise, dans l’ordre chronologique.",
                  "Each point represents a submitted answer, in chronological order.",
                )}
              </p>
            </>
          ) : (
            <Empty
              title={t(
                "La tendance viendra avec la pratique",
                "Your trend grows with practice",
              )}
              text={t(
                "Au moins deux réponses évaluées sont nécessaires pour tracer une évolution.",
                "At least two scored answers are needed to plot a trend.",
              )}
            />
          )}
          <h3>{t("Ce que ce score signifie", "What the score means")}</h3>
          <p className="muted">
            {t(
              "Il décrit les exercices observés, sans mesurer toute la compétence ni prédire une note d’examen. Les réponses ouvertes ne sont pas incluses.",
              "It describes observed exercises without measuring all competence or predicting an exam grade. Open responses are excluded.",
            )}
          </p>
        </section>
      </div>
      <section className="panel">
        <h2>{t("Historique des tentatives", "Attempt history")}</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t("Exercice", "Exercise")}</th>
                <th>{t("Chapitre", "Chapter")}</th>
                <th>Score</th>
                <th>Date</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.attempts.map((a) => (
                <tr key={a.id}>
                  <td>{t(a.exercise.title, a.exercise.titleEn)}</td>
                  <td>{a.exercise.topic}</td>
                  <td>
                    {a.score === null ? "—" : Math.round(a.score * 100) + "%"}
                  </td>
                  <td>
                    {new Date(a.createdAt).toLocaleDateString(
                      preferences.language,
                    )}
                  </td>
                  <td>
                    <Link href={"/practice/" + a.id} className="text-link">
                      {t("Revoir", "Review")}
                      <ArrowRight size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data.attempts.length && (
          <p className="muted">
            {t("Aucune tentative pour le moment.", "No attempts yet.")}
          </p>
        )}
      </section>
    </>
  );
}
export function Settings({
  data,
  onRefresh,
  onboarding = false,
}: {
  data: Bootstrap;
  onRefresh: () => void;
  onboarding?: boolean;
}) {
  const { t, preferences, setPreferences } = useUI();
  const router = useRouter();
  const [value, setValue] = useState<Preferences>({
    ...defaultPreferences,
    ...data.user.preferences,
    ...preferences,
  });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  return (
    <>
      <PageTitle
        eyebrow={
          onboarding
            ? t("BIENVENUE DANS VOTRE ATELIER", "WELCOME TO YOUR WORKBENCH")
            : t("VOTRE ESPACE / PRÉFÉRENCES", "YOUR WORKSPACE / PREFERENCES")
        }
        title={
          onboarding
            ? t("Un parcours à votre rythme.", "A path at your pace.")
            : t("Votre façon d’apprendre.", "Your way of learning.")
        }
        description={t(
          "Quelques préférences pour adapter vos prochaines séances.",
          "A few preferences to shape your next sessions.",
        )}
      />
      <section className="panel settings-panel">
        <div className="form-grid">
          <label>
            {t("Mon objectif", "My goal")}
            <select
              value={value.goal}
              onChange={(e) =>
                setValue({
                  ...value,
                  goal: e.target.value as Preferences["goal"],
                })
              }
            >
              <option value="learn">
                {t("Apprendre le cours", "Learn the course")}
              </option>
              <option value="td">
                {t("Préparer un TD", "Prepare a tutorial")}
              </option>
              <option value="exam">
                {t("Réviser un examen", "Revise for an exam")}
              </option>
            </select>
          </label>
          <label>
            {t("Mon aisance actuelle", "Current familiarity")}
            <select
              value={value.familiarity}
              onChange={(e) =>
                setValue({
                  ...value,
                  familiarity: e.target.value as Preferences["familiarity"],
                })
              }
            >
              <option value="beginner">
                {t("Je commence", "Just starting")}
              </option>
              <option value="some">
                {t("Quelques bases", "Some foundations")}
              </option>
              <option value="confident">
                {t("À l’aise, je consolide", "Confident, consolidating")}
              </option>
            </select>
          </label>
          <label>
            {t("Langue de l’interface", "Interface language")}
            <select
              value={value.language}
              onChange={(e) =>
                setValue({
                  ...value,
                  language: e.target.value as Preferences["language"],
                })
              }
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </label>
          <label>
            {t("Durée de séance", "Session length")}
            <select
              value={value.minutes}
              onChange={(e) =>
                setValue({ ...value, minutes: Number(e.target.value) })
              }
            >
              {[10, 15, 20, 30, 45, 60, 90].map((n) => (
                <option key={n} value={n}>
                  {n} min
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("Style d’explication", "Explanation style")}
            <select
              value={value.depth}
              onChange={(e) =>
                setValue({
                  ...value,
                  depth: e.target.value as Preferences["depth"],
                })
              }
            >
              <option value="brief">
                {t("Bref, étapes essentielles", "Brief, required steps")}
              </option>
              <option value="teach">{t("Pas à pas", "Step by step")}</option>
            </select>
          </label>
          <label>
            {t("Thème", "Theme")}
            <select
              value={value.theme}
              onChange={(e) =>
                setValue({
                  ...value,
                  theme: e.target.value as Preferences["theme"],
                })
              }
            >
              <option value="light">{t("Clair", "Light")}</option>
              <option value="dark">{t("Sombre", "Dark")}</option>
            </select>
          </label>
        </div>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={value.reducedMotion}
            onChange={(e) =>
              setValue({ ...value, reducedMotion: e.target.checked })
            }
          />
          {t("Réduire les animations", "Reduce animations")}
        </label>
        <ErrorBox message={error} />
        {status && (
          <div className="notice" role="status">
            {status}
          </div>
        )}
        <div className="button-row">
          <button
            className="button primary"
            onClick={async () => {
              try {
                const next = { ...value, onboarded: true };
                await api({ op: "settings", preferences: next });
                setPreferences(next);
                setStatus(t("Préférences enregistrées.", "Preferences saved."));
                onRefresh();
                if (onboarding) {
                  router.push("/dashboard");
                  router.refresh();
                }
              } catch (e) {
                setError(e instanceof Error ? e.message : "Save failed.");
              }
            }}
          >
            <Check size={15} />
            {onboarding
              ? t("Ouvrir mon espace", "Open my workspace")
              : t("Enregistrer", "Save")}
          </button>
          {onboarding && (
            <Link href="/dashboard" className="button ghost">
              {t("Passer pour le moment", "Skip for now")}
            </Link>
          )}
        </div>
      </section>
      {!onboarding && (
        <section className="panel settings-panel">
          <h2>{t("Mes données", "My data")}</h2>
          <p>
            {data.user.role === "GUEST"
              ? t(
                  "Votre progression est conservée sur ce navigateur pendant 30 jours. Gardez les cookies pour la retrouver.",
                  "Your progress is kept in this browser for 30 days. Keep cookies to return to it.",
                )
              : data.user.email}
          </p>
          <p className="muted">
            {t(
              "Exporter vos réponses, vos conversations et votre progression. Supprimer le compte efface définitivement ces données.",
              "Export answers, conversations and progress. Account deletion permanently removes these records.",
            )}
          </p>
          <div className="button-row">
            <a
              href="/api/data?action=export"
              download="compilab-data.json"
              className="button secondary"
            >
              <Download size={15} />
              {t("Exporter mes données", "Export my data")}
            </a>
            <button
              className="button danger"
              onClick={async () => {
                const confirmation = window.prompt(
                  t(
                    "Pour supprimer définitivement le compte et les réponses, saisir DELETE.",
                    "To permanently delete your account and answers, type DELETE.",
                  ),
                );
                if (confirmation !== "DELETE") return;
                try {
                  await api({ op: "deleteAccount", confirmation });
                  router.push("/");
                  router.refresh();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Deletion failed.");
                }
              }}
            >
              <Trash2 size={15} />
              {data.user.role === "GUEST"
                ? t("Effacer ma progression", "Clear my progress")
                : t("Supprimer mon compte", "Delete my account")}
            </button>
          </div>
        </section>
      )}
    </>
  );
}
export function Curriculum() {
  const { t } = useUI();
  return (
    <div className="marketing curriculum">
      <header className="marketing-header">
        <Logo />
        <Controls />
        <Link href="/dashboard" className="button primary">
          {t("Mon espace", "My workspace")}
          <ArrowRight size={15} />
        </Link>
      </header>
      <main>
        <PageTitle
          eyebrow="UNIVERSITÉ ORAN 1 / L3"
          title={t("Le programme de Compilab.", "The Compilab syllabus.")}
          description={t(
            "Analyse lexicale et syntaxique, dans un ordre progressif. Les extensions sémantiques et Flex/Yacc ne font pas partie du parcours actif.",
            "Lexical and syntactic analysis in a progressive sequence. Semantic and Flex/Yacc extensions are outside the active learning path.",
          )}
        />
        {modules.map((m, i) => (
          <section key={m.id} className="curriculum-module">
            <span className="module-number">0{i + 1}</span>
            <div>
              <h2>{t(m.title, m.titleEn)}</h2>
              <p>{t(m.description, m.descriptionEn)}</p>
              <div className="curriculum-lessons">
                {m.lessons.map((l) => (
                  <Link key={l.id} href={`/learn/${m.id}/${l.slug}`}>
                    <BookOpen size={15} />
                    {t(l.title, l.titleEn)}
                    <small>{l.duration} min</small>
                    <ArrowRight size={14} />
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
