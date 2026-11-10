import {
  CompilerError,
  END,
  Grammar,
  ParseResult,
  ParseStep,
  Production,
  computeSets,
  firstSequence,
  inputTokens,
} from "./grammar";
export type LRMethod = "LR0" | "SLR" | "LR1" | "LALR";
export type Item = { production: number; dot: number; lookahead: string };
export type LRAction =
  | { kind: "shift"; to: number }
  | { kind: "reduce"; production: number }
  | { kind: "accept" };
export type LRMachine = {
  method: LRMethod;
  augmented: string;
  productions: Production[];
  states: Item[][];
  transitions: { from: number; symbol: string; to: number }[];
  action: Record<string, LRAction[]>;
  goto: Record<string, number>;
  conflicts: {
    state: number;
    terminal: string;
    actions: LRAction[];
    kind: string;
  }[];
};
const ikey = (i: Item) => `${i.production}/${i.dot}/${i.lookahead}`;
const corekey = (items: Item[]) =>
  [...new Set(items.map((i) => `${i.production}/${i.dot}`))].sort().join(";");
const statekey = (items: Item[]) => items.map(ikey).sort().join(";");
export function actionText(a: LRAction) {
  return a.kind === "shift"
    ? `s${a.to}`
    : a.kind === "reduce"
      ? `r${a.production}`
      : "acc";
}
export function buildLR(g: Grammar, method: LRMethod): LRMachine {
  let augmented = g.start + "'";
  while (g.nonterminals.includes(augmented)) augmented += "'";
  const productions: Production[] = [
    { id: 0, lhs: augmented, rhs: [g.start] },
    ...g.productions,
  ];
  const byId = Object.fromEntries(productions.map((p) => [p.id, p]));
  const { first, follow } = computeSets(g);
  const canonical = method === "LR1" || method === "LALR";
  const closure = (seed: Item[]) => {
    const map = new Map(seed.map((i) => [ikey(i), i]));
    const queue = [...seed];
    for (let q = 0; q < queue.length; q++) {
      if (queue.length > 12000)
        throw new CompilerError("Closure exceeds 12,000 items.");
      const item = queue[q];
      const p = byId[item.production];
      const symbol = p.rhs[item.dot];
      if (!g.nonterminals.includes(symbol)) continue;
      const las = canonical
        ? [
            ...firstSequence(
              [...p.rhs.slice(item.dot + 1), item.lookahead],
              first,
            ),
          ]
        : [""];
      for (const next of productions.filter((p) => p.lhs === symbol))
        for (const lookahead of las) {
          const child = { production: next.id, dot: 0, lookahead };
          const key = ikey(child);
          if (!map.has(key)) {
            map.set(key, child);
            queue.push(child);
          }
        }
    }
    return [...map.values()].sort(
      (a, b) =>
        a.production - b.production ||
        a.dot - b.dot ||
        a.lookahead.localeCompare(b.lookahead),
    );
  };
  let states = [
    closure([{ production: 0, dot: 0, lookahead: canonical ? END : "" }]),
  ];
  let transitions: LRMachine["transitions"] = [];
  const index = new Map([[statekey(states[0]), 0]]);
  for (let from = 0; from < states.length; from++) {
    const symbols = [
      ...new Set(
        states[from].map((i) => byId[i.production].rhs[i.dot]).filter(Boolean),
      ),
    ].sort();
    for (const symbol of symbols) {
      const target = closure(
        states[from]
          .filter((i) => byId[i.production].rhs[i.dot] === symbol)
          .map((i) => ({ ...i, dot: i.dot + 1 })),
      );
      const key = statekey(target);
      let to = index.get(key);
      if (to === undefined) {
        if (states.length >= 200)
          throw new CompilerError(
            "Canonical collection exceeds 200 states. No classification returned.",
          );
        to = states.length;
        states.push(target);
        index.set(key, to);
      }
      transitions.push({ from, symbol, to });
    }
  }
  if (method === "LALR") {
    const groups = new Map<string, number>();
    const remap: number[] = [];
    const merged: Item[][] = [];
    states.forEach((state, i) => {
      const key = corekey(state);
      let group = groups.get(key);
      if (group === undefined) {
        group = merged.length;
        groups.set(key, group);
        merged.push([]);
      }
      remap[i] = group;
      const items = new Map(
        [...merged[group], ...state].map((i) => [ikey(i), i]),
      );
      merged[group] = [...items.values()];
    });
    transitions = [
      ...new Map(
        transitions.map((t) => {
          const value = {
            from: remap[t.from],
            symbol: t.symbol,
            to: remap[t.to],
          };
          return [`${value.from}/${value.symbol}/${value.to}`, value];
        }),
      ).values(),
    ];
    const deterministic = new Map<string, number>();
    for (const t of transitions) {
      const key = `${t.from}/${t.symbol}`;
      if (deterministic.has(key) && deterministic.get(key) !== t.to)
        throw new CompilerError("Inconsistent LALR merge.");
      deterministic.set(key, t.to);
    }
    states = merged;
  }
  const action: LRMachine["action"] = {};
  const go: LRMachine["goto"] = {};
  const put = (state: number, terminal: string, value: LRAction) => {
    const cell = (action[`${state}|${terminal}`] ??= []);
    if (!cell.some((a) => actionText(a) === actionText(value)))
      cell.push(value);
  };
  for (const t of transitions)
    if (g.nonterminals.includes(t.symbol)) go[`${t.from}|${t.symbol}`] = t.to;
    else put(t.from, t.symbol, { kind: "shift", to: t.to });
  states.forEach((state, n) => {
    for (const i of state) {
      const p = byId[i.production];
      if (i.dot !== p.rhs.length) continue;
      if (p.id === 0) put(n, END, { kind: "accept" });
      else
        for (const terminal of canonical
          ? [i.lookahead]
          : method === "SLR"
            ? follow[p.lhs]
            : [...g.terminals, END])
          put(n, terminal, { kind: "reduce", production: p.id });
    }
  });
  const conflicts = Object.entries(action)
    .filter(([, as]) => as.length > 1)
    .map(([cell, actions]) => {
      const split = cell.indexOf("|");
      const n = cell.slice(0, split),
        terminal = cell.slice(split + 1);
      return {
        state: Number(n),
        terminal,
        actions,
        kind: actions.some((a) => a.kind === "shift")
          ? "shift/reduce"
          : "reduce/reduce",
      };
    });
  return {
    method,
    augmented,
    productions,
    states,
    transitions,
    action,
    goto: go,
    conflicts,
  };
}
export function itemText(machine: LRMachine, item: Item) {
  const p = machine.productions.find((p) => p.id === item.production)!;
  const rhs = [...p.rhs];
  rhs.splice(item.dot, 0, "·");
  return `${p.lhs} → ${rhs.join(" ")}${item.lookahead ? `, ${item.lookahead}` : ""}`;
}
export function parseLR(
  g: Grammar,
  machine: LRMachine,
  input: string,
): ParseResult {
  if (machine.conflicts.length)
    return {
      status: "conflict",
      steps: [],
      message:
        "The table has conflicts. Resolve the grammar before simulation.",
    };
  const tokens = [...inputTokens(g, input), END];
  const states = [0];
  const symbols: string[] = [];
  const steps: ParseStep[] = [];
  let pos = 0;
  for (let n = 0; n < 1000; n++) {
    const state = states.at(-1)!;
    const a = machine.action[`${state}|${tokens[pos]}`]?.[0];
    const snapshot = {
      stack: states
        .map((s, i) => `${s}${symbols[i] ? " " + symbols[i] : ""}`)
        .join(" "),
      input: tokens.slice(pos).join(" "),
      state,
    };
    if (!a) {
      steps.push({ ...snapshot, action: "error" });
      return {
        status: "error",
        steps,
        message: `Empty ACTION[${state}, ${tokens[pos]}].`,
      };
    }
    steps.push({
      ...snapshot,
      action: actionText(a),
      production: a.kind === "reduce" ? a.production : undefined,
    });
    if (a.kind === "accept")
      return { status: "accept", steps, message: "Input accepted." };
    if (a.kind === "shift") {
      symbols.push(tokens[pos++]);
      states.push(a.to);
    } else {
      const p = g.productions.find((p) => p.id === a.production)!;
      if (p.rhs.length) {
        states.splice(-p.rhs.length);
        symbols.splice(-p.rhs.length);
      }
      const to = machine.goto[`${states.at(-1)}|${p.lhs}`];
      if (to === undefined)
        return {
          status: "error",
          steps,
          message: "Missing GOTO after reduction.",
        };
      symbols.push(p.lhs);
      states.push(to);
    }
  }
  return { status: "limit", steps, message: "Stopped at 1,000 parser steps." };
}
