"use client";
import { useEffect, useRef, useState, FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Plus, MessageSquare, Square, BookOpen } from "lucide-react";
import { Bootstrap, api } from "@/lib/client";
import { EXPRESSION } from "@/lib/courses";
import { useUI } from "./providers";
import { Badge, ErrorBox, PageTitle } from "./ui";
export function Tutor({
  data,
  onRefresh,
}: {
  data: Bootstrap;
  onRefresh: () => void;
}) {
  const { t, preferences, setPreferences } = useUI();
  const [threadId, setThreadId] = useState("");
  const [message, setMessage] = useState("");
  const [grammar, setGrammar] = useState(EXPRESSION);
  const [mode, setMode] = useState(
    data.providerConfigured ? "tutor" : "computed",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [latest, setLatest] = useState<{
    user: string;
    content: string;
    citations: { title: string; page: number; verified: boolean }[];
  } | null>(null);
  const controller = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.has("grammar")) setGrammar(p.get("grammar") ?? "");
    if (p.has("question")) setMessage(p.get("question") ?? "");
  }, []);
  useEffect(() => {
    bottom.current?.scrollIntoView({
      behavior: preferences.reducedMotion ? "instant" : "smooth",
      block: "nearest",
    });
  }, [busy, latest, preferences.reducedMotion]);
  const thread = data.threads.find((th) => th.id === threadId);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setBusy(true);
    setError("");
    controller.current = new AbortController();
    try {
      const result = await api<{
        threadId: string;
        content: string;
        citations: { title: string; page: number; verified: boolean }[];
      }>(
        {
          op: "chat",
          threadId: threadId || undefined,
          message,
          grammar: grammar || undefined,
          language: preferences.language,
          depth: preferences.depth,
          mode,
        },
        controller.current.signal,
      );
      setThreadId(result.threadId);
      setLatest({ user: message, ...result });
      setMessage("");
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tutor unavailable.");
    } finally {
      setBusy(false);
    }
  }
  const messages = thread?.messages.length
    ? thread.messages
    : latest
      ? [
          {
            id: "user-latest",
            role: "user",
            content: latest.user,
            citations: [],
          },
          {
            id: "assistant-latest",
            role: "assistant",
            content: latest.content,
            citations: latest.citations,
          },
        ]
      : [];
  return (
    <>
      <PageTitle
        eyebrow={t("UN RAISONNEMENT À LA FOIS", "ONE REASONING STEP AT A TIME")}
        title={t("Parlons de cette étape.", "Let’s work through that step.")}
        description={t(
          "La grammaire exacte et les traces du solveur accompagnent votre question.",
          "Your exact grammar and solver traces accompany your question.",
        )}
      >
        <Badge tone={data.providerConfigured ? "blue" : "amber"}>
          {data.providerConfigured
            ? t("Tuteur IA · NVIDIA NIM", "AI tutor · NVIDIA NIM")
            : t("NIM non configuré", "NIM not configured")}
        </Badge>
      </PageTitle>
      <div className="tutor-layout">
        <aside className="panel tutor-context">
          <button
            className="button secondary full"
            onClick={() => {
              setThreadId("");
              setLatest(null);
              setError("");
            }}
          >
            <Plus size={15} />
            {t("Nouvelle conversation", "New conversation")}
          </button>
          <div className="eyebrow">{t("CONVERSATIONS", "CONVERSATIONS")}</div>
          {data.threads.length ? (
            data.threads.map((th) => (
              <button
                key={th.id}
                className={`thread-button ${threadId === th.id ? "active" : ""}`}
                onClick={() => {
                  setThreadId(th.id);
                  setLatest(null);
                }}
              >
                <MessageSquare size={14} />
                <span>{th.title}</span>
              </button>
            ))
          ) : (
            <p className="muted">
              {t(
                "Les réponses finalisées sont conservées ici.",
                "Finalized replies are saved here.",
              )}
            </p>
          )}
          <label>
            {t("Contexte grammatical", "Grammar context")}
            <textarea
              className="code-editor"
              spellCheck={false}
              rows={8}
              value={grammar}
              maxLength={4000}
              onChange={(e) => setGrammar(e.target.value)}
              aria-label="Tutor grammar context"
            />
          </label>
          <label>
            {t("Type d’aide", "Assistance mode")}
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="computed">
                {t(
                  "Explication déterministe FIRST/FOLLOW",
                  "Computed FIRST/FOLLOW explanation",
                )}
              </option>
              <option value="tutor">
                {t("Tuteur IA · discussion", "AI tutor · chat")}
              </option>
              <option value="teach">
                {t("IA · expliquer un concept", "AI · teach a concept")}
              </option>
              <option value="hint">
                {t("IA · donner un indice", "AI · hint")}
              </option>
              <option value="explain-error">
                {t("IA · expliquer une erreur", "AI · explain an error")}
              </option>
              <option value="study-path">
                {t("IA · proposer un parcours", "AI · study path")}
              </option>
              <option value="translate">
                {t("IA · reformuler / traduire", "AI · rephrase / translate")}
              </option>
              <option value="exam-review">
                {t("IA · bilan après examen", "AI · exam review")}
              </option>
            </select>
          </label>
          <label>
            {t("Style", "Style")}
            <select
              value={preferences.depth}
              onChange={(e) =>
                setPreferences({ depth: e.target.value as "brief" | "teach" })
              }
            >
              <option value="brief">{t("Bref", "Brief")}</option>
              <option value="teach">{t("Pas à pas", "Step by step")}</option>
            </select>
          </label>
          <p className="source-note">
            {t(
              "Les extraits de conversations antérieures sont non vérifiés. Ils servent de contexte, jamais de preuve mathématique.",
              "Prior-conversation excerpts are unverified. They provide context, never mathematical authority.",
            )}
          </p>
        </aside>
        <section className="panel chat-panel">
          <div className="panel-heading">
            <h2>
              {mode === "computed"
                ? t("Le solveur explique", "The solver explains")
                : t("Tuteur de compilation", "Compilation tutor")}
            </h2>
            <Badge>
              {preferences.language.toUpperCase()} · {preferences.depth}
            </Badge>
          </div>
          <div className="chat-messages">
            {!messages.length && (
              <div className="tutor-empty">
                <span className="tutor-mark">→</span>
                <h2>
                  {t(
                    "Quel passage pose question ?",
                    "Which step needs clarity?",
                  )}
                </h2>
                <p>
                  {t(
                    "Choisissez un exemple pour démarrer avec une grammaire précise.",
                    "Choose an example to start with an exact grammar.",
                  )}
                </p>
                <div className="suggestion-list">
                  {[
                    "Why is FOLLOW(T) {+, ), $}?",
                    "Explain FIRST(E') step by step.",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        setGrammar(EXPRESSION);
                        setMessage(q);
                        setMode("computed");
                      }}
                    >
                      {q}
                      <Send size={13} />
                    </button>
                  ))}
                </div>
                {!data.providerConfigured && (
                  <div className="notice warning">
                    {t(
                      "Les réponses IA nécessitent NVIDIA_API_KEY côté serveur. Les explications calculées FIRST/FOLLOW sont disponibles maintenant.",
                      "AI replies require server-side NVIDIA_API_KEY. Computed FIRST/FOLLOW explanations are available now.",
                    )}
                  </div>
                )}
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`chat-message ${m.role}`}>
                <div className="chat-role">
                  {m.role === "user"
                    ? t("VOUS", "YOU")
                    : m.content.includes("déterministe") ||
                        m.content.includes("deterministic")
                      ? t("SOLVEUR", "SOLVER")
                      : "COMPILAB / NIM"}
                </div>
                <div className="markdown">
                  <ReactMarkdown skipHtml>{m.content}</ReactMarkdown>
                </div>
                {m.citations.length > 0 && (
                  <div className="source-citations">
                    <BookOpen size={13} />
                    {m.citations.map((c, i) => (
                      <span key={i}>
                        {c.title} · p. {c.page} ·{" "}
                        {c.verified
                          ? t("vérifié", "verified")
                          : t(
                              "conversation non vérifiée",
                              "unverified conversation",
                            )}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div className="chat-loading" role="status">
                {t(
                  "Le tuteur examine le contexte…",
                  "The tutor is examining the context…",
                )}
              </div>
            )}
            <div ref={bottom} />
          </div>
          <ErrorBox message={error} />
          <form className="chat-composer" onSubmit={submit}>
            <textarea
              aria-label={t("Votre question", "Your question")}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              maxLength={4000}
              placeholder={t(
                "Par exemple : pourquoi $ appartient à FOLLOW(T) ?",
                "For example: why does $ belong to FOLLOW(T)?",
              )}
              required
            />
            <div>
              <span>
                {mode === "computed"
                  ? t(
                      "Calcul local · sans modèle IA",
                      "Local computation · no AI model",
                    )
                  : t(
                      "NVIDIA NIM · réponse non diffusée en streaming",
                      "NVIDIA NIM · non-streaming reply",
                    )}
              </span>
              {busy ? (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => controller.current?.abort()}
                >
                  <Square size={13} />
                  {t("Annuler", "Cancel")}
                </button>
              ) : (
                <button
                  type="submit"
                  className="button primary"
                  disabled={!message.trim()}
                >
                  <Send size={15} />
                  {t("Envoyer", "Send")}
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
    </>
  );
}
