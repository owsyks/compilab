"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Check,
  Play,
  RotateCcw,
  Copy,
  Link as LinkIcon,
  Undo2,
  Maximize2,
  ArrowLeft,
} from "lucide-react";
import {
  parseGrammar,
  computeSets,
  buildLL1,
  parseLL1,
  productionText,
  serialize,
  eliminateLeftRecursion,
  leftFactor,
  leftRecursion,
  Grammar,
  ParseResult,
} from "@/lib/compiler/grammar";
import {
  buildLR,
  parseLR,
  LRMethod,
  LRMachine,
  itemText,
  actionText,
} from "@/lib/compiler/lr";
import {
  derive,
  searchDerivations,
  Derivation,
  projectExpressionAST,
} from "@/lib/compiler/derivation";
import { scanFiche1, identifierDFA, runDFA } from "@/lib/compiler/lexer";
import { PRESETS, EXPRESSION } from "@/lib/courses";
import { useUI } from "./providers";
import { Badge, ErrorBox, PageTitle, TraceView } from "./ui";
import { ItemGraph, TreeDiagram, DFAGraph } from "./diagrams";
export function Lab({ kind }: { kind: string }) {
  return kind === "lexer" ? (
    <LexerLab />
  ) : kind === "automata" ? (
    <AutomataLab />
  ) : (
    <GrammarLab kind={kind} />
  );
}
function ExpressionProjection({ tree }: { tree: Derivation["tree"] }) {
  const { t } = useUI();
  let ast;
  try {
    ast = projectExpressionAST(tree);
  } catch {
    return null;
  }
  return (
    <details className="proof-log">
      <summary>
        {t(
          "Projection AST explicite : opérateurs binaires, retrait de E/C et des parenthèses",
          "Explicit AST projection: binary operators, remove E/C and parentheses",
        )}
      </summary>
      <TreeDiagram tree={ast} />
    </details>
  );
}
function SetsTable({ g }: { g: Grammar }) {
  const { t } = useUI();
  const sets = computeSets(g);
  return (
    <>
      <div className="table-scroll">
        <table className="sets-table">
          <thead>
            <tr>
              <th>{t("Non-terminal", "Nonterminal")}</th>
              <th>FIRST</th>
              <th>FOLLOW</th>
              <th>{t("Annulable", "Nullable")}</th>
            </tr>
          </thead>
          <tbody>
            {g.nonterminals.map((n) => (
              <tr key={n}>
                <td className="mono symbol-cell">{n}</td>
                <td className="mono set-first">
                  {"{ " + sets.first[n].join(", ") + " }"}
                </td>
                <td className="mono set-follow">
                  {"{ " + sets.follow[n].join(", ") + " }"}
                </td>
                <td>{sets.nullable.includes(n) ? t("Oui", "Yes") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details className="proof-log">
        <summary>
          {t(
            "Comment chaque membre a été obtenu",
            "How every member was obtained",
          )}{" "}
          <Badge>
            {sets.trace.length} {t("ajouts", "additions")}
          </Badge>
        </summary>
        <ol>
          {sets.trace.map((event, i) => (
            <li key={i}>
              <Badge tone={event.kind === "FIRST" ? "blue" : "green"}>
                {event.kind}
              </Badge>
              <code>
                {event.symbol} ∋ {event.added}
              </code>
              <span>{event.reason}</span>
              <small>
                {t("Itération", "Iteration")} {event.iteration}
              </small>
            </li>
          ))}
        </ol>
      </details>
    </>
  );
}
export function GrammarLab({ kind }: { kind: string }) {
  const searchParams = useSearchParams();
  const { t } = useUI();
  const defaultSource =
    kind === "lr"
      ? PRESETS[2].source
      : kind === "grammar"
        ? PRESETS[5].source
        : EXPRESSION;
  const [source, setSource] = useState(defaultSource);
  const [snapshot, setSnapshot] = useState(defaultSource);
  const [input, setInput] = useState(
    kind === "lr" ? "c d d" : kind === "grammar" ? "i + v * i" : "id + id * id",
  );
  const [preset, setPreset] = useState(
    kind === "lr" ? "lr" : kind === "grammar" ? "ambiguous" : "expression",
  );
  const [g, setG] = useState(() => parseGrammar(defaultSource));
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [previous, setPrevious] = useState(defaultSource);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [method, setMethod] = useState<LRMethod>("SLR");
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    const requested = searchParams.get("method");
    if (
      kind === "lr" &&
      ["LR0", "SLR", "LR1", "LALR"].includes(requested ?? "")
    ) {
      setMethod(requested as LRMethod);
      setSelected(0);
      setResult(null);
    }
  }, [kind, searchParams]);
  const [filter, setFilter] = useState("");
  const [full, setFull] = useState(false);
  const [rules, setRules] = useState("");
  const [direction, setDirection] = useState<"left" | "right">("left");
  const [derivations, setDerivations] = useState<Derivation[]>([]);
  const [transform, setTransform] = useState<{
    text: string;
    trace: string[];
  } | null>(null);
  const [ambiguity, setAmbiguity] = useState("");
  useEffect(() => {
    try {
      const shared = new URLSearchParams(window.location.search).get("grammar");
      const saved = shared ?? localStorage.getItem("compilab-grammar-" + kind);
      if (saved && saved.length <= 12000) {
        setSource(saved);
        setSnapshot(saved);
        setG(parseGrammar(saved));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid saved grammar.");
    }
  }, [kind]);
  useEffect(() => {
    try {
      localStorage.setItem("compilab-grammar-" + kind, source);
    } catch {}
  }, [source, kind]);
  const ll = useMemo(() => buildLL1(g), [g]);
  const { machines, classifications } = useMemo(() => {
    const machines: Partial<Record<LRMethod, LRMachine>> = {};
    const classifications: {
      method: LRMethod;
      count: number | null;
      error?: string;
    }[] = [];
    if (kind === "lr")
      for (const m of ["LR0", "SLR", "LR1", "LALR"] as const) {
        try {
          const value = buildLR(g, m);
          classifications.push({ method: m, count: value.conflicts.length });
          machines[m] = value;
        } catch (e) {
          classifications.push({
            method: m,
            count: null,
            error: e instanceof Error ? e.message : "Limit reached.",
          });
        }
      }
    return { machines, classifications };
  }, [g, kind]);
  const machine = machines[method] ?? null;
  const titles: Record<string, [string, string]> = {
    grammar: ["Grammaires & arbres", "Grammars & trees"],
    "first-follow": ["FIRST & FOLLOW", "FIRST & FOLLOW"],
    ll1: ["Analyse prédictive LL(1)", "Predictive LL(1) parsing"],
    lr: ["LR(0), SLR(1), LR(1) et LALR(1)", "LR(0), SLR(1), LR(1) and LALR(1)"],
  };
  function compute(text = source) {
    try {
      const parsed = parseGrammar(text);
      setG(parsed);
      setSnapshot(text);
      setError("");
      setResult(null);
      setTransform(null);
      setSelected(0);
      setDerivations([]);
      setAmbiguity("");
      setMessage(
        t(
          "Grammaire validée. Résultats recalculés.",
          "Grammar validated. Results recomputed.",
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid grammar.");
    }
  }
  function choose(id: string) {
    const p = PRESETS.find((p) => p.id === id)!;
    setPreset(id);
    setPrevious(source);
    setSource(p.source);
    setInput(p.input);
    compute(p.source);
    setRules("");
  }
  function simulate() {
    try {
      setError("");
      setResult(
        kind === "lr" && machine
          ? parseLR(g, machine, input)
          : parseLL1(g, input),
      );
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "Invalid input.");
    }
  }
  function transformGrammar(mode: "recursion" | "factor") {
    try {
      const value =
        mode === "recursion" ? eliminateLeftRecursion(g) : leftFactor(g);
      setTransform({ text: serialize(value.grammar), trace: value.trace });
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transformation failed.");
    }
  }
  function deriveNow(search = false) {
    try {
      setError("");
      if (search) {
        const found = searchDerivations(g, input);
        setDerivations(found.results);
        setAmbiguity(
          found.ambiguity === "proven"
            ? t(
                "Ambiguïté prouvée : deux arbres distincts pour le même mot.",
                "Ambiguity proven: two distinct trees for the same string.",
              )
            : t(
                `Ambiguïté non déterminée. Recherche bornée : ${found.explored} formes, profondeur 24.`,
                `Ambiguity not determined. Bounded search: ${found.explored} forms, depth 24.`,
              ),
        );
      } else {
        setDerivations([
          derive(
            g,
            rules
              .split(/[\s,]+/)
              .filter(Boolean)
              .map(Number),
            direction,
          ),
        ]);
        setAmbiguity("");
      }
    } catch (e) {
      setDerivations([]);
      setError(e instanceof Error ? e.message : "Invalid derivation.");
    }
  }
  const selectedState = machine
    ? Math.min(selected, machine.states.length - 1)
    : 0;
  return (
    <>
      <PageTitle
        eyebrow={t(
          "L’ATELIER / ANALYSE SYNTAXIQUE",
          "WORKBENCH / SYNTAX ANALYSIS",
        )}
        title={t(...(titles[kind] ?? titles.grammar))}
        description={t(
          "Votre grammaire, des calculs reproductibles et chaque étape pour comprendre.",
          "Your grammar, reproducible computations and every step explained.",
        )}
      >
        <Badge tone="green">
          <span className="status-dot" />
          {t("Solveur déterministe", "Deterministic solver")}
        </Badge>
      </PageTitle>
      <div className="lab-switcher">
        {[
          ["grammar", "Grammaire", "Grammar"],
          ["first-follow", "FIRST / FOLLOW", "FIRST / FOLLOW"],
          ["ll1", "LL(1)", "LL(1)"],
          ["lr", "LR", "LR"],
        ].map(([id, fr, en]) => (
          <a
            href={"/lab/" + id}
            key={id}
            className={kind === id ? "active" : ""}
          >
            {t(fr, en)}
          </a>
        ))}
      </div>
      <div className={`workbench ${full ? "fullscreen-workbench" : ""}`}>
        <aside className="editor-column">
          <section className="panel grammar-editor">
            <div className="panel-heading">
              <h2>
                <span className="panel-index">01</span>
                {t("La grammaire", "The grammar")}
              </h2>
              <Badge>G</Badge>
            </div>
            <label className="tiny-label" htmlFor="preset">
              {t("EXEMPLES VÉRIFIÉS", "VERIFIED EXAMPLES")}
            </label>
            <select
              id="preset"
              value={preset}
              onChange={(e) => choose(e.target.value)}
            >
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <div className="editor-header">
              <span>productions.g</span>
              <span>
                {t("Axiome", "Start")}: {g.start}
              </span>
            </div>
            <textarea
              spellCheck={false}
              aria-label={t("Éditeur de grammaire", "Grammar editor")}
              value={source}
              onChange={(e) => {
                setPrevious(source);
                setSource(e.target.value);
              }}
              className="code-editor"
              rows={Math.max(7, source.split("\n").length + 2)}
            />
            <div className="editor-tools">
              <button
                className="icon-button"
                aria-label="Undo grammar edit"
                onClick={() => {
                  const old = source;
                  setSource(previous);
                  setPrevious(old);
                }}
              >
                <Undo2 size={15} />
              </button>
              <button
                className="icon-button"
                aria-label="Reset grammar"
                onClick={() => choose(preset)}
              >
                <RotateCcw size={15} />
              </button>
              <button
                className="icon-button"
                aria-label="Copy grammar"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(source);
                    setMessage(t("Grammaire copiée.", "Grammar copied."));
                  } catch {
                    setError(
                      t(
                        "Le presse-papiers est indisponible.",
                        "Clipboard unavailable.",
                      ),
                    );
                  }
                }}
              >
                <Copy size={15} />
              </button>
              <button
                className="icon-button"
                aria-label="Share grammar link"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      `${location.origin}/lab/${kind}?grammar=${encodeURIComponent(source)}`,
                    );
                    setMessage(t("Lien copié.", "Link copied."));
                  } catch {
                    setError("Clipboard unavailable.");
                  }
                }}
              >
                <LinkIcon size={15} />
              </button>
              <span>
                {source === snapshot
                  ? t("Enregistré localement", "Saved locally")
                  : t("Modifications non calculées", "Changes not computed")}
              </span>
            </div>
            <button className="button primary full" onClick={() => compute()}>
              <Play size={15} />
              {t("Valider & calculer", "Validate & compute")}
            </button>
            <details className="syntax-help">
              <summary>
                {t("Comment écrire une grammaire ?", "Grammar syntax")}
              </summary>
              <p>
                {t(
                  "Une règle par ligne. Flèche -> ou →. Séparer les symboles par des espaces. ε ou λ pour le mot vide. Guillemets pour un terminal composé.",
                  "One rule per line. Use -> or →. Space-separate symbols. ε or λ denotes empty. Quote compound terminals.",
                )}
              </p>
              <code>S -&gt; a A | ε</code>
              <p>
                {t(
                  "Limites : 60 productions, 200 états, 1 000 étapes.",
                  "Limits: 60 productions, 200 states, 1,000 steps.",
                )}
              </p>
            </details>
          </section>
          <section className="panel grammar-inventory">
            <div className="panel-heading">
              <h3>{t("Les composantes de G", "Grammar components")}</h3>
            </div>
            <dl>
              <dt>N</dt>
              <dd className="mono">{g.nonterminals.join(", ")}</dd>
              <dt>T</dt>
              <dd className="mono">{g.terminals.join(", ") || "∅"}</dd>
              <dt>S</dt>
              <dd className="mono">{g.start}</dd>
            </dl>
            <details>
              <summary>{g.productions.length} productions</summary>
              <ol className="production-list">
                {g.productions.map((p) => (
                  <li key={p.id}>
                    <span>r{p.id}</span>
                    <code>{productionText(p)}</code>
                  </li>
                ))}
              </ol>
            </details>
          </section>
          <div className="method-note">
            <span>ε ≠ $</span>
            <p>
              {t(
                "ε : aucun symbole.\n$ : fin de l’entrée.",
                "ε: no symbol.\n$: end of input.",
              )}
            </p>
          </div>
        </aside>
        <div className="output-column">
          <ErrorBox message={error} />
          {message && (
            <div className="inline-status" role="status">
              <Check size={13} />
              {message}
            </div>
          )}
          {source !== snapshot && (
            <div className="notice warning">
              {t(
                "Les résultats correspondent à la dernière grammaire validée. Cliquez sur Valider pour recalculer.",
                "Results correspond to the last validated grammar. Click Validate to recompute.",
              )}
            </div>
          )}
          {g.warnings.map((w) => (
            <div className="notice warning" key={w}>
              {w}
            </div>
          ))}
          {(kind === "first-follow" || kind === "ll1") && (
            <section className="panel">
              <div className="panel-heading">
                <h2>
                  <span className="panel-index">02</span>
                  {t(
                    "Les ensembles, au point fixe",
                    "Sets, at the fixed point",
                  )}
                </h2>
                <Badge tone="blue">
                  {computeSets(g).trace.length}{" "}
                  {t("ajouts justifiés", "justified additions")}
                </Badge>
              </div>
              <SetsTable g={g} />
            </section>
          )}
          {kind === "first-follow" && (
            <section className="panel">
              <h3>{t("Comparer votre réponse", "Compare your answer")}</h3>
              <SetCompare g={g} />
            </section>
          )}
          {kind === "ll1" && (
            <section className="panel">
              <div className="panel-heading">
                <h2>{t("Table prédictive M", "Predictive table M")}</h2>
                <Badge tone={ll.conflicts.length ? "red" : "green"}>
                  {ll.conflicts.length
                    ? `${ll.conflicts.length} ${t("conflits", "conflicts")}`
                    : t("LL(1) · aucun conflit", "LL(1) · no conflicts")}
                </Badge>
              </div>
              <div className="table-scroll">
                <table className="parsing-table">
                  <thead>
                    <tr>
                      <th>N \ token</th>
                      {[...g.terminals, "$"].map((s) => (
                        <th key={s}>{s}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {g.nonterminals.map((n) => (
                      <tr key={n}>
                        <th>{n}</th>
                        {[...g.terminals, "$"].map((s) => (
                          <td
                            key={s}
                            className={
                              (ll.table[`${n}|${s}`]?.length ?? 0) > 1
                                ? "conflict-cell"
                                : ""
                            }
                          >
                            {ll.table[`${n}|${s}`]
                              ?.map((id) => `r${id}`)
                              .join(" / ") || (
                              <span className="empty-cell">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {ll.conflicts.map((c) => (
                <div key={c.cell} className="notice error">
                  [{c.cell.replace("|", ", ")}] · {c.kind}:{" "}
                  {c.productions.map((p) => `r${p}`).join(" / ")}
                </div>
              ))}
            </section>
          )}
          {kind === "lr" && (
            <>
              <div className="classification-grid">
                {classifications.map((c) => (
                  <button
                    key={c.method}
                    onClick={() => {
                      setMethod(c.method);
                      setSelected(0);
                      setResult(null);
                    }}
                    className={`classification ${method === c.method ? "selected" : ""}`}
                  >
                    <strong>
                      {
                        {
                          LR0: "LR(0)",
                          SLR: "SLR(1)",
                          LR1: "LR(1)",
                          LALR: "LALR(1)",
                        }[c.method]
                      }
                    </strong>
                    <Badge
                      tone={
                        c.count === 0
                          ? "green"
                          : c.count === null
                            ? "amber"
                            : "red"
                      }
                    >
                      {c.count === 0
                        ? t("Sans conflit", "Conflict-free")
                        : c.count === null
                          ? t("Limite atteinte", "Limit reached")
                          : `${c.count} ${t("conflits", "conflicts")}`}
                    </Badge>
                  </button>
                ))}
              </div>
              {!machine && (
                <ErrorBox
                  message={
                    classifications.find((c) => c.method === method)?.error ??
                    "State limit reached."
                  }
                />
              )}{" "}
              {machine && (
                <>
                  <section className="panel lr-panel">
                    <div className="panel-heading">
                      <h2>
                        {t("Automate canonique", "Canonical automaton")}{" "}
                        <Badge>
                          {machine.states.length} {t("états", "states")}
                        </Badge>
                      </h2>
                      <button
                        className="icon-button"
                        aria-label="Toggle fullscreen workbench"
                        onClick={() => setFull(!full)}
                      >
                        <Maximize2 size={17} />
                      </button>
                    </div>
                    <div className="augmentation mono">
                      r0 : {machine.augmented} → {g.start}
                    </div>
                    <div className="lr-graph-layout">
                      <div className="state-list">
                        <input
                          aria-label="Filter item states"
                          placeholder={t("Filtrer…", "Filter…")}
                          value={filter}
                          onChange={(e) => setFilter(e.target.value)}
                        />
                        {machine.states.map(
                          (items, i) =>
                            `I${i} ${items.map((item) => itemText(machine!, item)).join(" ")}`
                              .toLowerCase()
                              .includes(filter.toLowerCase()) && (
                              <button
                                key={i}
                                className={selectedState === i ? "active" : ""}
                                onClick={() => setSelected(i)}
                              >
                                I{i}
                                <small>{items.length}</small>
                                {machine!.conflicts.some(
                                  (c) => c.state === i,
                                ) && <span className="conflict-dot">!</span>}
                              </button>
                            ),
                        )}
                      </div>
                      <ItemGraph
                        key={`${snapshot}-${method}`}
                        machine={machine}
                        selected={selectedState}
                        onSelect={setSelected}
                      />
                      <div className="selected-state">
                        <div className="eyebrow">
                          {t("ÉTAT SÉLECTIONNÉ", "SELECTED STATE")}
                        </div>
                        <h3>I{selectedState}</h3>
                        {machine.states[selectedState].map((item, i) => (
                          <code key={i}>{itemText(machine!, item)}</code>
                        ))}
                        <h4>GOTO</h4>
                        {machine.transitions
                          .filter((e) => e.from === selectedState)
                          .map((e) => (
                            <button
                              className="transition-link"
                              key={e.symbol}
                              onClick={() => setSelected(e.to)}
                            >
                              {e.symbol}
                              <ArrowRight size={13} /> I{e.to}
                            </button>
                          ))}
                      </div>
                    </div>
                  </section>
                  <section className="panel">
                    <div className="panel-heading">
                      <h2>ACTION / GOTO</h2>
                      <span className="muted">
                        s = shift · r = reduce · acc = accept
                      </span>
                    </div>
                    <div className="table-scroll">
                      <table className="parsing-table">
                        <thead>
                          <tr>
                            <th>I</th>
                            {[...g.terminals, "$", ...g.nonterminals].map(
                              (s) => (
                                <th key={s}>{s}</th>
                              ),
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {machine.states.map((_, n) => (
                            <tr
                              key={n}
                              className={
                                n === selectedState ? "selected-row" : ""
                              }
                            >
                              <th>
                                <button
                                  className="text-button"
                                  onClick={() => setSelected(n)}
                                >
                                  {n}
                                </button>
                              </th>
                              {[...g.terminals, "$"].map((s) => (
                                <td
                                  key={s}
                                  className={
                                    (machine!.action[`${n}|${s}`]?.length ??
                                      0) > 1
                                      ? "conflict-cell"
                                      : ""
                                  }
                                >
                                  {machine!.action[`${n}|${s}`]
                                    ?.map(actionText)
                                    .join(" / ") || (
                                    <span className="empty-cell">—</span>
                                  )}
                                </td>
                              ))}
                              {g.nonterminals.map((s) => (
                                <td key={s}>
                                  {machine!.goto[`${n}|${s}`] ?? (
                                    <span className="empty-cell">—</span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {machine.conflicts.map((c) => (
                      <button
                        className="conflict-evidence"
                        key={`${c.state}-${c.terminal}`}
                        onClick={() => setSelected(c.state)}
                      >
                        <Badge tone="red">{c.kind}</Badge>
                        <code>
                          ACTION[{c.state}, {c.terminal}] ={" "}
                          {c.actions.map(actionText).join(" / ")}
                        </code>
                        <ArrowRight size={14} />
                      </button>
                    ))}
                  </section>
                </>
              )}
            </>
          )}
          {kind === "grammar" && (
            <>
              <section className="panel">
                <div className="panel-heading">
                  <h2>
                    {t(
                      "Diagnostic & transformations",
                      "Diagnosis & transformations",
                    )}
                  </h2>
                  <Badge tone={leftRecursion(g).length ? "amber" : "green"}>
                    {leftRecursion(g).length
                      ? t("Récursivité gauche", "Left recursion")
                      : t("Pas de récursivité gauche", "No left recursion")}
                  </Badge>
                </div>
                {leftRecursion(g).length > 0 && (
                  <p className="mono">{leftRecursion(g).join(", ")}</p>
                )}
                <div className="button-row">
                  <button
                    className="button secondary"
                    onClick={() => transformGrammar("recursion")}
                  >
                    {t("Éliminer la récursivité", "Eliminate left recursion")}
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => transformGrammar("factor")}
                  >
                    {t("Factoriser", "Left factor")}
                  </button>
                </div>
                {transform && (
                  <div className="transformation">
                    <pre>{transform.text}</pre>
                    {transform.trace.map((s, i) => (
                      <p key={i}>
                        {i + 1}. {s}
                      </p>
                    ))}
                    <button
                      className="button primary"
                      onClick={() => {
                        setPrevious(source);
                        setSource(transform.text);
                        compute(transform.text);
                      }}
                    >
                      {t(
                        "Appliquer cette transformation",
                        "Apply this transformation",
                      )}
                      <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <h2>{t("Dérivation & arbre", "Derivation & tree")}</h2>
                  <Badge>r1 … rn</Badge>
                </div>
                <div className="form-grid">
                  <label>
                    {t("Mot à dériver", "Target string")}
                    <input
                      className="mono"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                    />
                  </label>
                  <label>
                    {t("Direction", "Direction")}
                    <select
                      value={direction}
                      onChange={(e) => {
                        setDirection(e.target.value as "left" | "right");
                        setDerivations([]);
                      }}
                    >
                      <option value="left">{t("Gauche", "Leftmost")}</option>
                      <option value="right">{t("Droite", "Rightmost")}</option>
                    </select>
                  </label>
                </div>
                <label>
                  {t(
                    "Suite des productions (numéros)",
                    "Production sequence (numbers)",
                  )}
                  <input
                    className="mono"
                    value={rules}
                    onChange={(e) => setRules(e.target.value)}
                    placeholder="1, 2, 3…"
                  />
                </label>
                <div className="button-row">
                  <button
                    className="button primary"
                    onClick={() => deriveNow()}
                  >
                    <Play size={14} />
                    {t("Appliquer la suite", "Apply sequence")}
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => deriveNow(true)}
                  >
                    {t("Chercher des arbres", "Search for trees")}
                  </button>
                </div>
                {ambiguity && <div className="notice warning">{ambiguity}</div>}
                {derivations.length === 0 && ambiguity && (
                  <p>
                    {t(
                      "Aucun arbre trouvé dans les limites de recherche. Cela ne prouve pas la non-appartenance.",
                      "No tree found within search limits. This does not prove nonmembership.",
                    )}
                  </p>
                )}
                {derivations.map((d, i) => (
                  <div key={i} className="derivation-output">
                    <div className="panel-heading">
                      <h3>
                        {t("Arbre", "Tree")} {i + 1}
                      </h3>
                      <code>{d.rules.join(" → ")}</code>
                    </div>
                    <div className="derivation-forms">
                      {d.forms.map((f, j) => (
                        <div key={j}>
                          <span>{j ? "⇒" : g.start === f[0] ? "G" : ""}</span>
                          <code>{f.join(" ") || "ε"}</code>
                          {j > 0 && <Badge>r{d.rules[j - 1]}</Badge>}
                        </div>
                      ))}
                    </div>
                    <TreeDiagram tree={d.tree} />
                    <ExpressionProjection tree={d.tree} />
                  </div>
                ))}
              </section>
            </>
          )}
          {(kind === "ll1" || kind === "lr") && (
            <section className="panel simulation">
              <div className="panel-heading">
                <h2>
                  <span className="panel-index">03</span>
                  {t("Analyser un mot", "Parse a string")}
                </h2>
                <Badge>
                  {method === "SLR" && kind === "lr"
                    ? "SLR(1)"
                    : kind === "lr"
                      ? method
                      : "LL(1)"}
                </Badge>
              </div>
              <div className="input-action">
                <input
                  aria-label={t("Mot à analyser", "Input string")}
                  className="mono"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                <button className="button primary" onClick={simulate}>
                  <Play size={15} />
                  {t("Analyser", "Parse")}
                </button>
              </div>
              <small className="muted">
                {t(
                  "Séparer les terminaux composés par des espaces. La fin $ est ajoutée automatiquement.",
                  "Separate compound tokens with spaces. The end marker $ is added automatically.",
                )}
              </small>
            </section>
          )}
          {result && (
            <TraceView
              key={`${kind}-${method}-${snapshot}-${JSON.stringify(result.steps)}`}
              result={result}
            />
          )}
        </div>
      </div>
    </>
  );
}
function SetCompare({ g }: { g: Grammar }) {
  const { t } = useUI();
  const [target, setTarget] = useState(g.nonterminals[0]);
  const [kind, setKind] = useState<"FIRST" | "FOLLOW">("FOLLOW");
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  return (
    <>
      <div className="form-grid">
        <label>
          {t("Ensemble", "Set")}
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as "FIRST" | "FOLLOW")}
          >
            <option>FIRST</option>
            <option>FOLLOW</option>
          </select>
        </label>
        <label>
          {t("Non-terminal", "Nonterminal")}
          <select
            value={g.nonterminals.includes(target) ? target : g.start}
            onChange={(e) => setTarget(e.target.value)}
          >
            {g.nonterminals.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="input-action">
        <input
          aria-label="Your mathematical set"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="+, ), $"
        />
        <button
          className="button secondary"
          onClick={() => {
            const sets = computeSets(g);
            const expected = (kind === "FIRST" ? sets.first : sets.follow)[
              g.nonterminals.includes(target) ? target : g.start
            ];
            const actual = answer
              .replace(/[{}]/g, "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            const missing = expected.filter((s) => !actual.includes(s)),
              extra = actual.filter((s) => !expected.includes(s));
            setFeedback(
              missing.length || extra.length
                ? `${t("Manquants", "Missing")}: ${missing.join(", ") || "∅"} · ${t("En trop", "Extra")}: ${extra.join(", ") || "∅"}`
                : t("Ensemble exact.", "Exact set."),
            );
          }}
        >
          {t("Comparer", "Compare")}
        </button>
      </div>
      {feedback && <div className="notice">{feedback}</div>}
    </>
  );
}
function LexerLab() {
  const { t } = useUI();
  const [source, setSource] = useState("Int a\nInt b\na := 10\nb := a");
  const [snapshot, setSnapshot] = useState(source);
  const [result, setResult] = useState(() => scanFiche1(source));
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");
  const current = result.trace[index];
  return (
    <>
      <PageTitle
        eyebrow="L’ATELIER / FICHE 1"
        title={t(
          "Un caractère. Un lexème. Un token.",
          "One character. One lexeme. One token.",
        )}
        description={t(
          "Les règles exactes de la Fiche 1 : Int, Si, alors, sinon, fsi ; entiers non signés ; := et <.",
          "Exact Fiche 1 rules: Int, Si, alors, sinon, fsi; unsigned integers; := and <.",
        )}
      >
        <Badge tone="green">
          {t("Blancs séparateurs", "Whitespace-separated")}
        </Badge>
      </PageTitle>
      <div className="workbench">
        <aside className="editor-column">
          <section className="panel">
            <div className="panel-heading">
              <h2>{t("Programme source", "Source program")}</h2>
              <Badge>Fiche 1</Badge>
            </div>
            <textarea
              className="code-editor"
              rows={12}
              aria-label="Source program"
              spellCheck={false}
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
            <button
              className="button primary full"
              onClick={() => {
                try {
                  setResult(scanFiche1(source));
                  setSnapshot(source);
                  setIndex(0);
                  setError("");
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Invalid source.");
                }
              }}
            >
              <Play size={15} />
              {t("Tokeniser", "Tokenize")}
            </button>
            <p className="muted">
              {t(
                "Chaque lexème doit être séparé par au moins un blanc. Aucun opérateur supplémentaire n’est accepté.",
                "Every lexeme must be separated by whitespace. No additional operators are accepted.",
              )}
            </p>
          </section>
          <section className="panel">
            <h3>{t("Table des symboles", "Symbol table")}</h3>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t("Identificateur", "Identifier")}</th>
                </tr>
              </thead>
              <tbody>
                {result.symbols.map((s) => (
                  <tr key={s.id}>
                    <td>{s.id}</td>
                    <td className="mono">{s.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </aside>
        <div className="output-column">
          <ErrorBox message={error} />
          {source !== snapshot && (
            <div className="notice warning">
              {t(
                "Cliquer sur Tokeniser pour mettre à jour les résultats.",
                "Click Tokenize to update results.",
              )}
            </div>
          )}
          <section className="panel">
            <div className="panel-heading">
              <h2>
                {t(
                  "Lecture caractère par caractère",
                  "Character-by-character scan",
                )}
              </h2>
              <Badge tone={current?.state === "sink" ? "red" : "blue"}>
                {current?.state ?? "q0"}
              </Badge>
            </div>
            <pre className="source-playback">
              {snapshot.split("").map((c, i) => (
                <span
                  key={i}
                  className={i === current?.offset ? "char-active" : ""}
                >
                  {c}
                </span>
              ))}
            </pre>
            <div className="trace-controls">
              <button
                className="icon-button"
                aria-label="Previous character"
                disabled={!index}
                onClick={() => setIndex(index - 1)}
              >
                <ArrowLeft size={16} />
              </button>
              <input
                aria-label="Character playback position"
                type="range"
                min={0}
                max={Math.max(0, result.trace.length - 1)}
                value={index}
                onChange={(e) => setIndex(Number(e.target.value))}
              />
              <button
                className="icon-button"
                aria-label="Next character"
                disabled={index >= result.trace.length - 1}
                onClick={() => setIndex(index + 1)}
              >
                <ArrowRight size={16} />
              </button>
            </div>
            <p className="muted">
              {t("Offset mémoire", "Memory offset")} {current?.offset ?? 0} ·{" "}
              {t(
                "État de reconnaissance du lexème courant",
                "Recognition state for current lexeme",
              )}
            </p>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <h2>{t("Le flux de tokens", "Token stream")}</h2>
              <Badge>{result.tokens.length} tokens</Badge>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{t("Lexème", "Lexeme")}</th>
                    <th>{t("Classe", "Category")}</th>
                    <th>{t("Attribut", "Attribute")}</th>
                    <th>{t("Position", "Position")}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.tokens.map((token, i) => (
                    <tr
                      key={i}
                      className={
                        current &&
                        current.offset >= token.offset &&
                        current.offset < token.offset + token.lexeme.length
                          ? "selected-row"
                          : ""
                      }
                    >
                      <td className="mono">{token.lexeme}</td>
                      <td>
                        <Badge
                          tone={
                            token.kind === "keyword"
                              ? "blue"
                              : token.kind === "identifier"
                                ? "green"
                                : "neutral"
                          }
                        >
                          {token.kind}
                        </Badge>
                      </td>
                      <td className="mono">
                        {token.symbol
                          ? `sym[${token.symbol}]`
                          : token.kind === "integer"
                            ? token.lexeme
                            : "—"}
                      </td>
                      <td>
                        {token.line}:{token.column}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          {result.errors.map((e, i) => (
            <ErrorBox
              key={i}
              message={`${e.line}:${e.column} · ${e.lexeme} — ${e.message}`}
            />
          ))}
          <section className="panel">
            <h3>{t("Représentation en mémoire", "Memory representation")}</h3>
            <div className="memory-cells">
              {snapshot.split("").map((c, i) => (
                <div key={i} className={current?.offset === i ? "active" : ""}>
                  <small>{i}</small>
                  <code>{c === "\n" ? "\\n" : c === " " ? "␠" : c}</code>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
function AutomataLab() {
  const { t } = useUI();
  const [input, setInput] = useState("total2");
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState(() => runDFA(identifierDFA, "total2"));
  const [currentDfa, setCurrentDfa] = useState(identifierDFA);
  const [stateText, setStateText] = useState(
    JSON.stringify(identifierDFA, null, 2),
  );
  const [error, setError] = useState("");
  return (
    <>
      <PageTitle
        eyebrow={t(
          "L’ATELIER / AUTOMATES FINIS",
          "WORKBENCH / FINITE AUTOMATA",
        )}
        title={t(
          "Suivre un automate déterministe",
          "Trace a deterministic automaton",
        )}
        description={t(
          "Modifier l’AFD en JSON, lancer un mot et suivre chaque transition. Modèle initial : identificateur [A-Za-z][A-Za-z0-9_]*.",
          "Edit the DFA as JSON, run a string and inspect every transition. Initial pattern: identifier [A-Za-z][A-Za-z0-9_]*.",
        )}
      />
      <div className="two-column">
        <section className="panel">
          <h2>{t("Définition de l’AFD", "DFA definition")}</h2>
          <textarea
            className="code-editor"
            rows={18}
            aria-label="DFA JSON editor"
            value={stateText}
            onChange={(e) => setStateText(e.target.value)}
          />
          <label>
            {t("Mot à tester", "Input string")}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={3000}
            />
          </label>
          <button
            className="button primary"
            onClick={() => {
              try {
                if (stateText.length > 20000)
                  throw new Error("DFA definition too large.");
                const d = JSON.parse(stateText) as typeof identifierDFA;
                if (
                  !Array.isArray(d.states) ||
                  d.states.length > 30 ||
                  !d.states.includes(d.start) ||
                  !Array.isArray(d.finals) ||
                  !d.finals.every((s) => d.states.includes(s)) ||
                  !Array.isArray(d.alphabet) ||
                  d.alphabet.length > 30 ||
                  !d.transitions ||
                  typeof d.transitions !== "object"
                )
                  throw new Error(
                    "Invalid DFA definition: check states, alphabet, start and final states.",
                  );
                for (const key of Object.keys(d.transitions)) {
                  const [s, a] = key.split("|");
                  if (
                    !d.states.includes(s) ||
                    !d.alphabet.includes(a) ||
                    !d.states.includes(d.transitions[key])
                  )
                    throw new Error("Invalid transition.");
                }
                for (const s of d.states)
                  for (const a of d.alphabet)
                    if (!d.transitions[`${s}|${a}`])
                      throw new Error(
                        "Provide a total transition function for every state and alphabet symbol.",
                      );
                setCurrentDfa(d);
                setResult(runDFA(d, input));
                setIndex(0);
                setError("");
              } catch (e) {
                setError(e instanceof Error ? e.message : "Invalid DFA.");
              }
            }}
          >
            <Play size={15} />
            {t("Valider & exécuter", "Validate & run")}
          </button>
          <ErrorBox message={error} />
        </section>
        <div className="output-column">
          <section className="panel">
            <div className="panel-heading">
              <h2>{t("L’état courant", "Current state")}</h2>
              <Badge tone={result.accepted ? "green" : "red"}>
                {result.accepted
                  ? t("Mot accepté", "String accepted")
                  : t("Mot rejeté", "String rejected")}
              </Badge>
            </div>
            <DFAGraph
              dfa={currentDfa}
              current={
                result.trace[Math.min(index, result.trace.length - 1)].state
              }
            />
            <div className="dfa-states">
              {currentDfa.states.map((s) => (
                <button
                  className={`dfa-state ${result.trace[Math.min(index, result.trace.length - 1)].state === s ? "current" : ""} ${currentDfa.finals.includes(s) ? "final" : ""}`}
                  key={s}
                  onClick={() => {
                    const i = result.trace.findIndex((t) => t.state === s);
                    if (i >= 0) setIndex(i);
                  }}
                >
                  {currentDfa.start === s && <small>→</small>}
                  {s}
                </button>
              ))}
            </div>
            <div className="trace-controls">
              <button
                className="button secondary"
                disabled={!index}
                onClick={() => setIndex(index - 1)}
              >
                <ArrowLeft size={14} />
                {t("Précédent", "Previous")}
              </button>
              <span>
                {index} / {result.trace.length - 1}
              </span>
              <button
                className="button secondary"
                disabled={index === result.trace.length - 1}
                onClick={() => setIndex(index + 1)}
              >
                {t("Suivant", "Next")}
                <ArrowRight size={14} />
              </button>
            </div>
          </section>
          <section className="panel">
            <h3>{t("Transitions δ", "Transition function δ")}</h3>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>q</th>
                    {currentDfa.alphabet.map((a) => (
                      <th key={a}>{a}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentDfa.states.map((s) => (
                    <tr key={s}>
                      <th>{s}</th>
                      {currentDfa.alphabet.map((a) => (
                        <td key={a}>{currentDfa.transitions[`${s}|${a}`]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="panel">
            <h3>{t("Trace calculée", "Computed trace")}</h3>
            {result.trace.map((s, i) => (
              <div
                className={`dfa-trace ${index === i ? "selected-row" : ""}`}
                key={i}
              >
                <span>{i}</span>
                <code>{s.character || "ε"}</code>
                <ArrowRight size={13} />
                <code>{s.state}</code>
              </div>
            ))}
          </section>
        </div>
      </div>
    </>
  );
}
