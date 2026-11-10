"use client";
import React, {
  Component,
  ReactNode,
  useEffect,
  useRef,
  useState,
  useMemo,
  FormEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import {
  Send,
  Plus,
  MessageSquare,
  Square,
  BookOpen,
  Sparkles,
  Bot,
  HelpCircle,
  Lightbulb,
} from "lucide-react";
import katex from "katex";
import { Bootstrap, api } from "@/lib/client";
import { EXPRESSION } from "@/lib/courses";
import { useUI } from "./providers";
import { Badge, ErrorBox, PageTitle } from "./ui";

type Citation = {
  title: string;
  page: number;
  verified: boolean;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
};

type SavedThread = {
  id: string;
  title: string;
  messages: ChatMessage[];
};

function safeCitations(raw: unknown): Citation[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .filter((c) => c && typeof c === "object")
      .map((c: any) => ({
        title: typeof c.title === "string" ? c.title : "Document",
        page: typeof c.page === "number" ? c.page : 1,
        verified: Boolean(c.verified),
      }));
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return safeCitations(parsed);
      }
    } catch {}
  }
  return [];
}

class ChatErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: any) {
    console.warn("Caught error in chat render:", err);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function MathSpan({
  math,
  display = false,
}: {
  math: string;
  display?: boolean;
}) {
  try {
    const html = katex.renderToString(math, {
      displayMode: display,
      throwOnError: false,
    });
    return (
      <span
        className={display ? "katex-display-wrapper" : "katex-inline-wrapper"}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch {
    return <span>{math}</span>;
  }
}

function safeRenderMath(text: string) {
  if (typeof text !== "string") return String(text ?? "");
  try {
    const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$)/g);
    return parts.map((part, i) => {
      if (part.startsWith("$$") && part.endsWith("$$") && part.length > 4) {
        return <MathSpan key={i} math={part.slice(2, -2).trim()} display />;
      }
      if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
        return <MathSpan key={i} math={part.slice(1, -1).trim()} />;
      }
      return part;
    });
  } catch {
    return text;
  }
}

const STORAGE_ACTIVE_KEY = "compilab_tutor_active_chat";
const STORAGE_THREADS_KEY = "compilab_tutor_all_threads";

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
  const [mode, setMode] = useState("tutor");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const initialGreeting: ChatMessage = useMemo(() => {
    return {
      id: "welcome-greeting",
      role: "assistant",
      content:
        preferences.language === "en"
          ? "👋 **Welcome to your AI Compilation Tutor!**\n\nI am your dedicated academic assistant for the **L3 Computer Science Compilation curriculum at Université Oran 1**.\n\nHere is what you can ask me:\n* 📘 **Lectures & Core Theory**: Formal grammars, ambiguity, regular expressions, and parsing.\n* 🧮 **FIRST & FOLLOW**: Exact computation steps, closure derivations, and trace verification.\n* 🌲 **Top-Down Parsing (LL)**: LL(1) conditions, left-recursion elimination, left-factoring, and parsing tables.\n* ⚙️ **Bottom-Up Parsing (LR)**: LR(0), SLR(1), LR(1), LALR(1) item sets, Action/Goto tables, and conflict handling.\n* 📝 **TD & Exam Guidance**: Socratic walk-throughs for exercises and past exams.\n\nType your question below or click a starter prompt!"
          : "👋 **Bienvenue sur votre Tuteur IA de Compilation !**\n\nJe suis votre assistant pédagogique dédié au module de **Compilation (L3 Informatique · Université Oran 1)**.\n\nVoici ce que nous pouvons explorer ensemble :\n* 📘 **Cours & Théorie** : Grammaires formelles, ambiguïté, expressions régulières et automates finis.\n* 🧮 **FIRST & FOLLOW** : Calcul méthodique, règles de propagation et traces détaillées.\n* 🌲 **Analyse LL(1)** : Vérification des conditions, élimination de la récursion gauche, factorisation et table prédictive.\n* ⚙️ **Analyse LR** : Construction des items LR(0), SLR(1), LR(1), LALR(1), tables ACTION/GOTO et résolution des conflits.\n* 📝 **Exercices de TD & Examens** : Accompagnement pas à pas sur les fiches de TD d'Oran 1.\n\nPosez votre question ci-dessous ou cliquez sur un sujet rapide pour démarrer !",
      citations: [],
    };
  }, [preferences.language]);

  const [localThreads, setLocalThreads] = useState<SavedThread[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_THREADS_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
    }
    return [];
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_ACTIVE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((m: any, idx: number) => ({
              id: m.id || `msg-${idx}`,
              role: m.role === "user" ? "user" : "assistant",
              content: typeof m.content === "string" ? m.content : String(m.content ?? ""),
              citations: safeCitations(m.citations),
            }));
          }
        }
      } catch {}
    }
    return [initialGreeting];
  });

  useEffect(() => {
    try {
      if (
        chatMessages.length > 1 ||
        (chatMessages.length === 1 && chatMessages[0].id !== "welcome-greeting")
      ) {
        localStorage.setItem(STORAGE_ACTIVE_KEY, JSON.stringify(chatMessages));
      }
    } catch {}
  }, [chatMessages]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.has("grammar")) setGrammar(p.get("grammar") ?? "");
    if (p.has("question")) setMessage(p.get("question") ?? "");
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({
      behavior: preferences.reducedMotion ? "instant" : "smooth",
      block: "nearest",
    });
  }, [busy, chatMessages, preferences.reducedMotion]);

  const allThreads = useMemo(() => {
    const map = new Map<string, { id: string; title: string; messages: any[] }>();
    for (const lt of localThreads) {
      if (lt && lt.id) map.set(lt.id, lt);
    }
    for (const st of data.threads ?? []) {
      if (st && st.id) {
        const existing = map.get(st.id);
        map.set(st.id, {
          id: st.id,
          title: st.title || existing?.title || "Conversation",
          messages:
            Array.isArray(st.messages) && st.messages.length > 0
              ? st.messages
              : existing?.messages || [],
        });
      }
    }
    return Array.from(map.values());
  }, [localThreads, data.threads]);

  const starterPrompts = useMemo(() => {
    return preferences.language === "en"
      ? [
          {
            label: "LL(1) Grammar Conditions",
            query:
              "Explain step by step the conditions required for a context-free grammar to be LL(1).",
          },
          {
            label: "FIRST & FOLLOW Algorithm",
            query:
              "How do we compute the FIRST and FOLLOW sets for a grammar? Walk through the formal rules.",
          },
          {
            label: "Left Recursion Elimination",
            query:
              "How do we eliminate direct and indirect left recursion from a grammar? Show an example.",
          },
          {
            label: "SLR(1) vs LR(1) vs LALR(1)",
            query:
              "What is the concrete difference between SLR(1), canonical LR(1), and LALR(1) parsers?",
          },
        ]
      : [
          {
            label: "Conditions pour qu'une grammaire soit LL(1)",
            query:
              "Explique-moi pas à pas les conditions nécessaires et suffisantes pour qu'une grammaire soit LL(1).",
          },
          {
            label: "Calcul des ensembles FIRST et FOLLOW",
            query:
              "Comment calcule-t-on les ensembles FIRST et FOLLOW ? Détaille les règles formelles avec un exemple.",
          },
          {
            label: "Élimination de la récursion à gauche",
            query:
              "Comment éliminer la récursion à gauche (directe et indirecte) d'une grammaire ? Donne la formule et un exemple.",
          },
          {
            label: "Différence entre SLR(1), LR(1) et LALR(1)",
            query:
              "Quelle est la différence concrète entre les analyseurs SLR(1), LR(1) canonique et LALR(1) ?",
          },
        ];
  }, [preferences.language]);

  async function sendMessage(textToSend: string) {
    const prompt = textToSend.trim();
    if (!prompt || busy) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: prompt,
      citations: [],
    };

    const nextMessages = [...chatMessages, userMsg];
    setChatMessages(nextMessages);
    setMessage("");
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
          message: prompt,
          grammar: grammar || undefined,
          language: preferences.language,
          depth: preferences.depth,
          mode,
        },
        controller.current.signal,
      );

      const activeId = result.threadId || threadId || `thr-${Date.now()}`;
      setThreadId(activeId);
      const assistantMsg: ChatMessage = {
        id: `ast-${Date.now()}`,
        role: "assistant",
        content: result.content,
        citations: safeCitations(result.citations),
      };

      const finalMessages = [...nextMessages, assistantMsg];
      setChatMessages(finalMessages);

      const newThread: SavedThread = {
        id: activeId,
        title: prompt.slice(0, 40),
        messages: finalMessages,
      };
      setLocalThreads((prev) => {
        const filtered = prev.filter((t) => t.id !== activeId);
        const updated = [newThread, ...filtered];
        try {
          localStorage.setItem(STORAGE_THREADS_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      onRefresh();
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError(e instanceof Error ? e.message : "Tutor unavailable.");
      }
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void sendMessage(message);
  }

  function handleNewChat() {
    setThreadId("");
    setError("");
    setMessage("");
    setChatMessages([initialGreeting]);
    try {
      localStorage.removeItem(STORAGE_ACTIVE_KEY);
    } catch {}
  }

  function loadThread(thId: string) {
    setThreadId(thId);
    setError("");
    const th = allThreads.find((t) => t.id === thId);
    if (th && Array.isArray(th.messages) && th.messages.length > 0) {
      const loaded = th.messages.map((m: any, idx: number) => ({
        id: m.id || `msg-${idx}`,
        role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
        content: typeof m.content === "string" ? m.content : String(m.content ?? ""),
        citations: safeCitations(m.citations),
      }));
      setChatMessages(loaded);
      try {
        localStorage.setItem(STORAGE_ACTIVE_KEY, JSON.stringify(loaded));
      } catch {}
    }
  }

  return (
    <>
      <PageTitle
        eyebrow={t(
          "TUTEUR IA DE COMPILATION · L3 ORAN 1",
          "AI COMPILATION TUTOR · L3 ORAN 1",
        )}
        title={t(
          "Discutez avec votre Tuteur de Compilation.",
          "Chat with your Compilation Tutor.",
        )}
        description={t(
          "Posez vos questions sur les cours, les TD et les examens, ou faites analyser vos grammaires pas à pas.",
          "Ask questions on lectures, labs and exams, or analyze your grammars step by step.",
        )}
      >
        <Badge tone={data.providerConfigured ? "blue" : "amber"}>
          {data.providerConfigured
            ? t(
                "● Tuteur IA en ligne · NVIDIA Nemotron 30B",
                "● AI Tutor Online · NVIDIA Nemotron 30B",
              )
            : t("Mode déterministe local", "Local deterministic mode")}
        </Badge>
      </PageTitle>

      <div className="tutor-layout">
        <aside className="panel tutor-context">
          <button className="button secondary full" onClick={handleNewChat}>
            <Plus size={15} />
            {t("Nouvelle conversation", "New conversation")}
          </button>

          <div className="eyebrow">
            {t("CONVERSATIONS SAUVEGARDÉES", "SAVED CONVERSATIONS")}
          </div>
          {allThreads.length ? (
            allThreads.map((th) => (
              <button
                key={th.id}
                className={`thread-button ${threadId === th.id ? "active" : ""}`}
                onClick={() => loadThread(th.id)}
              >
                <MessageSquare size={14} />
                <span>{th.title || t("Conversation", "Conversation")}</span>
              </button>
            ))
          ) : (
            <p className="muted">
              {t(
                "Vos échanges sont sauvegardés au fil de l'étude.",
                "Your chat exchanges are saved as you learn.",
              )}
            </p>
          )}

          <label>
            {t("Contexte grammatical", "Grammar context")}
            <textarea
              className="code-editor"
              spellCheck={false}
              rows={6}
              value={grammar}
              maxLength={4000}
              onChange={(e) => setGrammar(e.target.value)}
              aria-label="Tutor grammar context"
              placeholder="E -> E + T | T&#10;T -> T * F | F&#10;F -> ( E ) | id"
            />
          </label>

          <label>
            {t("Type d’aide", "Assistance mode")}
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="tutor">
                {t(
                  "🤖 Tuteur IA · discussion libre",
                  "🤖 AI Tutor · open discussion",
                )}
              </option>
              <option value="teach">
                {t("📚 IA · expliquer un concept", "📚 AI · teach a concept")}
              </option>
              <option value="hint">
                {t("💡 IA · donner un indice", "💡 AI · pedagogical hint")}
              </option>
              <option value="explain-error">
                {t("⚠️ IA · expliquer une erreur", "⚠️ AI · explain an error")}
              </option>
              <option value="study-path">
                {t("🗺️ IA · proposer un parcours", "🗺️ AI · study roadmap")}
              </option>
              <option value="computed">
                {t(
                  "⚙️ Solveur déterministe FIRST/FOLLOW",
                  "⚙️ Deterministic FIRST/FOLLOW solver",
                )}
              </option>
            </select>
          </label>

          <label>
            {t("Style pédagogique", "Pedagogical depth")}
            <select
              value={preferences.depth}
              onChange={(e) =>
                setPreferences({ depth: e.target.value as "brief" | "teach" })
              }
            >
              <option value="teach">
                {t("Pas à pas détaillé", "Detailed step-by-step")}
              </option>
              <option value="brief">
                {t("Synthétique & direct", "Brief & concise")}
              </option>
            </select>
          </label>

          <p className="source-note">
            {t(
              "Les explications sont calquées sur les fiches de cours, TD et examens de l'Université Oran 1 (L3).",
              "Explanations align with Université Oran 1 (L3) lectures, lab sheets, and exam archives.",
            )}
          </p>
        </aside>

        <section className="panel chat-panel">
          <div className="panel-heading">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Bot size={18} />
              <h2>
                {mode === "computed"
                  ? t(
                      "Solveur Déterministe Compilab",
                      "Compilab Deterministic Solver",
                    )
                  : t("Tuteur IA de Compilation", "Compilation AI Tutor")}
              </h2>
            </div>
            <Badge>
              {preferences.language.toUpperCase()} ·{" "}
              {preferences.depth === "teach"
                ? t("Détaillé", "Step by step")
                : t("Bref", "Brief")}
            </Badge>
          </div>

          <ChatErrorBoundary
            fallback={
              <div className="notice warning" style={{ margin: "20px" }}>
                <p>
                  {t(
                    "Une erreur est survenue lors de l'affichage de cette conversation.",
                    "An error occurred while displaying this conversation.",
                  )}
                </p>
                <button
                  type="button"
                  className="button secondary"
                  onClick={handleNewChat}
                  style={{ marginTop: "10px" }}
                >
                  {t("Nouvelle conversation", "New conversation")}
                </button>
              </div>
            }
          >
            <div className="chat-messages">
              {chatMessages.map((m) => {
                const isUser = m.role === "user";
                const content =
                  typeof m.content === "string"
                    ? m.content
                    : String(m.content ?? "");
                const citations = safeCitations(m.citations);
                return (
                  <div key={m.id} className={`chat-message ${m.role}`}>
                    <div className="chat-role">
                      {isUser
                        ? t("VOUS", "YOU")
                        : content.includes("déterministe") ||
                            content.includes("deterministic")
                          ? t("SOLVEUR FORMEL", "FORMAL SOLVER")
                          : "TUTEUR IA · COMPILAB / NIM"}
                    </div>
                    <div className="markdown">
                      <ReactMarkdown
                        components={{
                          p({ children }) {
                            return (
                              <p>
                                {Array.isArray(children)
                                  ? children.map((c, i) =>
                                      typeof c === "string" ? (
                                        <span key={i}>{safeRenderMath(c)}</span>
                                      ) : (
                                        c
                                      ),
                                    )
                                  : typeof children === "string"
                                    ? safeRenderMath(children)
                                    : children}
                              </p>
                            );
                          },
                          li({ children }) {
                            return (
                              <li>
                                {Array.isArray(children)
                                  ? children.map((c, i) =>
                                      typeof c === "string" ? (
                                        <span key={i}>{safeRenderMath(c)}</span>
                                      ) : (
                                        c
                                      ),
                                    )
                                  : typeof children === "string"
                                    ? safeRenderMath(children)
                                    : children}
                              </li>
                            );
                          },
                        }}
                      >
                        {content}
                      </ReactMarkdown>
                    </div>
                    {citations.length > 0 && (
                      <div className="source-citations">
                        <BookOpen size={13} />
                        {citations.map((c, i) => (
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
                );
              })}

              {chatMessages.length <= 1 && (
                <div className="tutor-chips">
                  {starterPrompts.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      className="tutor-chip"
                      onClick={() => void sendMessage(s.query)}
                    >
                      <Sparkles size={13} />
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {busy && (
                <div className="chat-loading" role="status">
                  <Sparkles
                    size={14}
                    className="spin"
                    style={{ display: "inline-block", marginRight: "6px" }}
                  />
                  {t(
                    "Le tuteur IA examine le contexte et prépare une explication détaillée…",
                    "The AI tutor is analyzing context and formulating a detailed response…",
                  )}
                </div>
              )}
              <div ref={bottom} />
            </div>
          </ChatErrorBoundary>

          <ErrorBox message={error} />

          <form className="chat-composer" onSubmit={submit}>
            <textarea
              aria-label={t("Votre question", "Your question")}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage(message);
                }
              }}
              rows={2}
              maxLength={4000}
              placeholder={t(
                "Posez votre question (ex: Pourquoi $ est dans FOLLOW(T) ? Comment prouver que cette grammaire est LL(1) ?)",
                "Ask a question (e.g. Why is $ in FOLLOW(T)? How to prove this grammar is LL(1)?)",
              )}
              required
            />
            <div>
              <span>
                {mode === "computed"
                  ? t(
                      "Solveur algorithmique formel",
                      "Algorithmic formal solver",
                    )
                  : t(
                      "NVIDIA Nemotron 30B · Appuyez sur Entrée pour envoyer",
                      "NVIDIA Nemotron 30B · Press Enter to send",
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
