export const EPS = "ε";
export const END = "$";
export type Production = { id: number; lhs: string; rhs: string[] };
export type Grammar = {
  start: string;
  nonterminals: string[];
  terminals: string[];
  productions: Production[];
  warnings: string[];
  symbols: { name: string; kind: "terminal" | "nonterminal" }[];
};
export class CompilerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CompilerError";
  }
}
const unique = <T>(xs: T[]) => [...new Set(xs)];

function splitAlternatives(text: string): string[] {
  const parts: string[] = [];
  let part = "";
  let quote = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      part += c;
      if (c === quote) quote = "";
    } else if (
      c === '"' ||
      (c === "'" && (i === 0 || /[\s|]/.test(text[i - 1])))
    ) {
      quote = c;
      part += c;
    } else if (c === "|") {
      parts.push(part);
      part = "";
    } else part += c;
  }
  if (quote) throw new CompilerError("Unclosed quoted terminal.");
  return [...parts, part];
}

export function parseGrammar(source: string, start?: string): Grammar {
  if (!source.trim() || source.length > 12000)
    throw new CompilerError("Enter a grammar of at most 12,000 characters.");
  const lines = source
    .replace(/→/g, "->")
    .split(/[\n;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const rows = lines.map((line, i) => {
    const match = /^([A-Z][A-Za-z0-9_']*)\s*->\s*(.+)$/.exec(line);
    if (!match)
      throw new CompilerError(
        `Line ${i + 1}: expected S -> a A | ε. Nonterminals start with an uppercase letter.`,
      );
    return { lhs: match[1], alternatives: splitAlternatives(match[2]) };
  });
  const nonterminals = unique(rows.map((r) => r.lhs));
  if (nonterminals.length > 25)
    throw new CompilerError("Limit: 25 nonterminals.");
  const tokenize = (value: string) => {
    const raw = value.trim();
    if (["ε", "λ", "epsilon"].includes(raw)) return [];
    if (!raw) throw new CompilerError("Empty alternative: write ε explicitly.");
    const chunks = raw.match(/"[^"\n]+"|'[^'\n]+'|[^\s]+/g) ?? [];
    const symbols: string[] = [];
    for (const chunk of chunks) {
      if (
        (chunk.startsWith('"') && chunk.endsWith('"')) ||
        (chunk.startsWith("'") && chunk.endsWith("'"))
      ) {
        const literal = chunk.slice(1, -1);
        if (nonterminals.includes(literal))
          throw new CompilerError(
            `Terminal '${literal}' collides with a nonterminal. N and T must be disjoint.`,
          );
        symbols.push(literal);
        continue;
      }
      if (
        nonterminals.includes(chunk) ||
        chunk === "id" ||
        chunk === ":=" ||
        (chunks.length > 1 && /^[a-z][a-z0-9_]*$/.test(chunk))
      ) {
        symbols.push(chunk);
        continue;
      }
      if (/^[a-z]{2,}$/.test(chunk))
        throw new CompilerError(
          `Ambiguous compact sequence '${chunk}': separate symbols with spaces or quote one terminal.`,
        );
      let rest = chunk;
      while (rest) {
        const nt = [...nonterminals]
          .sort((a, b) => b.length - a.length)
          .find((n) => rest.startsWith(n));
        if (nt) {
          symbols.push(nt);
          rest = rest.slice(nt.length);
        } else if (/^[A-Z]/.test(rest))
          throw new CompilerError(
            `Undefined nonterminal '${rest.match(/^[A-Z][A-Za-z0-9_']*/)?.[0]}'.`,
          );
        else {
          const symbol = rest.startsWith("id") ? "id" : rest[0];
          symbols.push(symbol);
          rest = rest.slice(symbol.length);
        }
      }
    }
    if (symbols.some((s) => ["ε", "λ", "$"].includes(s)))
      throw new CompilerError(
        "ε must be the whole alternative; $ is reserved for end of input.",
      );
    if (symbols.length > 30)
      throw new CompilerError("Limit: 30 symbols per production.");
    return symbols;
  };
  const productions: Production[] = [];
  const warnings: string[] = [];
  for (const row of rows)
    for (const alt of row.alternatives) {
      const rhs = tokenize(alt);
      if (
        productions.some(
          (p) =>
            p.lhs === row.lhs && JSON.stringify(p.rhs) === JSON.stringify(rhs),
        )
      )
        warnings.push(
          `Duplicate production: ${row.lhs} → ${rhs.join(" ") || EPS}`,
        );
      productions.push({ id: productions.length + 1, lhs: row.lhs, rhs });
    }
  if (productions.length > 60)
    throw new CompilerError("Limit: 60 productions.");
  const axiom = start ?? nonterminals[0];
  if (!nonterminals.includes(axiom))
    throw new CompilerError("The start symbol has no production.");
  const terminals = unique(
    productions.flatMap((p) => p.rhs).filter((s) => !nonterminals.includes(s)),
  );
  const reachable = new Set([axiom]);
  let change = true;
  while (change) {
    change = false;
    for (const p of productions)
      if (reachable.has(p.lhs))
        for (const s of p.rhs)
          if (nonterminals.includes(s) && !reachable.has(s)) {
            reachable.add(s);
            change = true;
          }
  }
  for (const n of nonterminals)
    if (!reachable.has(n)) warnings.push(`Unreachable nonterminal: ${n}`);
  const productive = new Set<string>();
  let productiveChanged = true;
  while (productiveChanged) {
    productiveChanged = false;
    for (const p of productions)
      if (
        p.rhs.every((s) => !nonterminals.includes(s) || productive.has(s)) &&
        !productive.has(p.lhs)
      ) {
        productive.add(p.lhs);
        productiveChanged = true;
      }
  }
  for (const n of nonterminals)
    if (!productive.has(n))
      warnings.push(`Nonproductive nonterminal (no terminal word): ${n}`);
  return {
    start: axiom,
    nonterminals: [axiom, ...nonterminals.filter((n) => n !== axiom)],
    terminals,
    productions,
    warnings,
    symbols: [
      ...nonterminals.map((name) => ({ name, kind: "nonterminal" as const })),
      ...terminals.map((name) => ({ name, kind: "terminal" as const })),
    ],
  };
}

export function serialize(g: Grammar): string {
  return g.nonterminals
    .map(
      (n) =>
        `${n} -> ${g.productions
          .filter((p) => p.lhs === n)
          .map(
            (p) =>
              p.rhs
                .map((s) =>
                  g.nonterminals.includes(s) ||
                  /^[a-z0-9_+*():=<\-]$/.test(s) ||
                  s === "id"
                    ? s
                    : JSON.stringify(s),
                )
                .join(" ") || EPS,
          )
          .join(" | ")}`,
    )
    .join("\n");
}
export function productionText(p: Production) {
  return `${p.lhs} → ${p.rhs.join(" ") || EPS}`;
}
export type SetTrace = {
  iteration: number;
  kind: "FIRST" | "FOLLOW";
  symbol: string;
  added: string;
  reason: string;
  production?: number;
};
export type Sets = {
  first: Record<string, string[]>;
  follow: Record<string, string[]>;
  nullable: string[];
  trace: SetTrace[];
};
export function firstSequence(
  sequence: string[],
  first: Record<string, Iterable<string>>,
): Set<string> {
  const result = new Set<string>();
  let nullable = true;
  for (const s of sequence) {
    const values = new Set(Object.hasOwn(first, s) ? first[s] : [s]);
    for (const t of values) if (t !== EPS) result.add(t);
    if (!values.has(EPS)) {
      nullable = false;
      break;
    }
  }
  if (nullable) result.add(EPS);
  return result;
}
export function computeSets(g: Grammar): Sets {
  const first: Record<string, Set<string>> = Object.fromEntries(
    g.nonterminals.map((n) => [n, new Set<string>()]),
  );
  const follow: Record<string, Set<string>> = Object.fromEntries(
    g.nonterminals.map((n) => [n, new Set<string>()]),
  );
  const trace: SetTrace[] = [];
  let iteration = 0;
  let changed = true;
  const add = (
    map: Record<string, Set<string>>,
    kind: "FIRST" | "FOLLOW",
    symbol: string,
    added: string,
    reason: string,
    production?: number,
  ) => {
    if (map[symbol].has(added)) return false;
    map[symbol].add(added);
    trace.push({ iteration, kind, symbol, added, reason, production });
    return true;
  };
  while (changed) {
    changed = false;
    iteration++;
    for (const p of g.productions)
      for (const t of firstSequence(p.rhs, first))
        changed =
          add(
            first,
            "FIRST",
            p.lhs,
            t,
            `r${p.id}: FIRST(${p.rhs.join(" ") || EPS})`,
            p.id,
          ) || changed;
  }
  add(follow, "FOLLOW", g.start, END, "Start symbol: end of input.");
  changed = true;
  while (changed) {
    changed = false;
    iteration++;
    for (const p of g.productions)
      p.rhs.forEach((s, i) => {
        if (!Object.hasOwn(follow, s)) return;
        const suffix = p.rhs.slice(i + 1);
        const values = firstSequence(suffix, first);
        for (const t of values)
          if (t !== EPS)
            changed =
              add(
                follow,
                "FOLLOW",
                s,
                t,
                `r${p.id}: FIRST(${suffix.join(" ") || EPS}) − {ε}`,
                p.id,
              ) || changed;
        if (values.has(EPS))
          for (const t of follow[p.lhs])
            changed =
              add(
                follow,
                "FOLLOW",
                s,
                t,
                `r${p.id}: nullable suffix; inherit FOLLOW(${p.lhs})`,
                p.id,
              ) || changed;
      });
  }
  return {
    first: Object.fromEntries(
      Object.entries(first).map(([n, v]) => [n, [...v].sort()]),
    ),
    follow: Object.fromEntries(
      Object.entries(follow).map(([n, v]) => [n, [...v].sort()]),
    ),
    nullable: g.nonterminals.filter((n) => first[n].has(EPS)),
    trace,
  };
}
export function inputTokens(g: Grammar, text: string): string[] {
  if (text.length > 3000)
    throw new CompilerError("Input limit: 3,000 characters.");
  const raw = text.trim();
  if (!raw || raw === EPS) return [];
  if (g.terminals.includes(raw)) return [raw];
  if (/\s|["']/.test(raw)) {
    const parts = (raw.match(/"[^"\n]+"|'[^'\n]+'|[^\s]+/g) ?? []).map((p) =>
      (p.startsWith('"') && p.endsWith('"')) ||
      (p.startsWith("'") && p.endsWith("'"))
        ? p.slice(1, -1)
        : p,
    );
    if (parts.some((p) => !g.terminals.includes(p)))
      throw new CompilerError(
        "Unknown input terminal. Separate tokens with spaces; quote terminals containing spaces.",
      );
    return parts;
  }
  const out: string[] = [];
  let rest = raw;
  while (rest) {
    const matches = g.terminals.filter((t) => rest.startsWith(t));
    if (matches.length !== 1)
      throw new CompilerError(
        "Unknown or ambiguous input. Separate terminal tokens with spaces.",
      );
    out.push(matches[0]);
    rest = rest.slice(matches[0].length);
  }
  return out;
}
export type ParseStep = {
  stack: string;
  input: string;
  action: string;
  production?: number;
  state?: number;
};
export type ParseResult = {
  status: "accept" | "error" | "conflict" | "limit";
  steps: ParseStep[];
  message: string;
};
export function buildLL1(g: Grammar) {
  const sets = computeSets(g);
  const table: Record<string, number[]> = {};
  const causes: Record<string, string[]> = {};
  for (const p of g.productions) {
    const f = firstSequence(p.rhs, sets.first);
    for (const t of g.terminals.concat(END)) {
      const cause = f.has(t)
        ? "FIRST"
        : f.has(EPS) && sets.follow[p.lhs].includes(t)
          ? "FOLLOW"
          : null;
      if (cause) {
        const key = `${p.lhs}|${t}`;
        (table[key] ??= []).push(p.id);
        (causes[key] ??= []).push(cause);
      }
    }
  }
  const conflicts = Object.entries(table)
    .filter(([, ids]) => ids.length > 1)
    .map(([cell, productions]) => ({
      cell,
      productions,
      kind: causes[cell].every((c) => c === "FIRST")
        ? "FIRST/FIRST"
        : "FIRST/FOLLOW",
    }));
  return { sets, table, conflicts };
}
export function parseLL1(g: Grammar, text: string): ParseResult {
  const { table, conflicts } = buildLL1(g);
  if (conflicts.length)
    return {
      status: "conflict",
      steps: [],
      message: "Conflicted LL(1) table: no arbitrary production is selected.",
    };
  const tokens = [...inputTokens(g, text), END];
  const stack = [END, g.start];
  let pos = 0;
  const steps: ParseStep[] = [];
  for (let limit = 0; limit < 1000; limit++) {
    const top = stack.at(-1)!;
    const look = tokens[pos];
    const snapshot = {
      stack: [...stack].reverse().join(" "),
      input: tokens.slice(pos).join(" "),
    };
    if (top === END && look === END) {
      steps.push({ ...snapshot, action: "accept" });
      return { status: "accept", steps, message: "Input accepted." };
    }
    if (!g.nonterminals.includes(top)) {
      if (top !== look) {
        steps.push({ ...snapshot, action: `error: expected ${top}` });
        return {
          status: "error",
          steps,
          message: `Expected ${top}, received ${look}.`,
        };
      }
      steps.push({ ...snapshot, action: `match ${look}` });
      stack.pop();
      pos++;
    } else {
      const id = table[`${top}|${look}`]?.[0];
      const p = g.productions.find((p) => p.id === id);
      if (!p) {
        steps.push({ ...snapshot, action: `error M[${top}, ${look}]` });
        return {
          status: "error",
          steps,
          message: `Empty table cell [${top}, ${look}].`,
        };
      }
      steps.push({
        ...snapshot,
        action: `r${p.id}: ${productionText(p)}`,
        production: p.id,
      });
      stack.pop();
      stack.push(...[...p.rhs].reverse());
    }
  }
  return {
    status: "limit",
    steps,
    message: "Stopped at the 1,000-step limit.",
  };
}

export function leftRecursion(g: Grammar): string[] {
  const { nullable } = computeSets(g);
  const edges: Record<string, string[]> = Object.fromEntries(
    g.nonterminals.map((n) => [n, []]),
  );
  for (const p of g.productions)
    for (const s of p.rhs) {
      if (g.nonterminals.includes(s)) edges[p.lhs].push(s);
      if (!nullable.includes(s)) break;
    }
  return g.nonterminals.filter((n) => {
    const seen = new Set<string>();
    const queue = [...edges[n]];
    while (queue.length) {
      const s = queue.shift()!;
      if (s === n) return true;
      if (!seen.has(s)) {
        seen.add(s);
        queue.push(...edges[s]);
      }
    }
    return false;
  });
}
function rebuild(g: Grammar, rules: { lhs: string; rhs: string[] }[]) {
  const nts = [...new Set(rules.map((r) => r.lhs))];
  return parseGrammar(
    rules
      .map(
        (r) =>
          `${r.lhs} -> ${r.rhs.map((s) => (nts.includes(s) ? s : JSON.stringify(s))).join(" ") || EPS}`,
      )
      .join("\n"),
    g.start,
  );
}
export function eliminateLeftRecursion(g: Grammar) {
  if (computeSets(g).nullable.length)
    throw new CompilerError(
      "This transformation supports grammars without ε productions. Remove nullable cycles first; equivalence is not assumed.",
    );
  const rules = g.productions.map((p) => ({ lhs: p.lhs, rhs: [...p.rhs] }));
  const trace: string[] = [];
  for (let i = 0; i < g.nonterminals.length; i++) {
    const a = g.nonterminals[i];
    for (let j = 0; j < i; j++) {
      const b = g.nonterminals[j];
      const matches = rules.filter((r) => r.lhs === a && r.rhs[0] === b);
      for (const r of matches) {
        rules.splice(rules.indexOf(r), 1);
        for (const q of [...rules].filter((q) => q.lhs === b))
          rules.push({ lhs: a, rhs: [...q.rhs, ...r.rhs.slice(1)] });
        trace.push(`Substitute ${b} in ${a}.`);
      }
      if (rules.length > 60)
        throw new CompilerError("Substitution exceeds 60 productions.");
    }
    const alpha = rules.filter((r) => r.lhs === a && r.rhs[0] === a);
    const beta = rules.filter((r) => r.lhs === a && r.rhs[0] !== a);
    if (!alpha.length) continue;
    if (!beta.length || alpha.some((r) => r.rhs.length === 1))
      throw new CompilerError(
        `Cannot apply the standard elimination to ${a}: no base alternative or a unit self-cycle.`,
      );
    let fresh = a + "'";
    while (rules.some((r) => r.lhs === fresh)) fresh += "'";
    for (const r of [...alpha, ...beta]) rules.splice(rules.indexOf(r), 1);
    for (const r of beta) rules.push({ lhs: a, rhs: [...r.rhs, fresh] });
    for (const r of alpha)
      rules.push({ lhs: fresh, rhs: [...r.rhs.slice(1), fresh] });
    rules.push({ lhs: fresh, rhs: [] });
    trace.push(`${a} → β ${fresh}; ${fresh} → α ${fresh} | ε.`);
    if (rules.length > 60)
      throw new CompilerError("Transformation exceeds 60 productions.");
  }
  const result = rebuild(g, rules);
  if (leftRecursion(result).length)
    throw new CompilerError("Left recursion remains; transformation refused.");
  return { grammar: result, trace };
}
export function leftFactor(g: Grammar) {
  const rules = g.productions.map((p) => ({ lhs: p.lhs, rhs: [...p.rhs] }));
  const trace: string[] = [];
  for (let k = 0; k < 50; k++) {
    let best: { lhs: string; prefix: string[] } | undefined;
    for (const a of rules)
      for (const b of rules)
        if (a !== b && a.lhs === b.lhs) {
          let n = 0;
          while (n < a.rhs.length && n < b.rhs.length && a.rhs[n] === b.rhs[n])
            n++;
          if (n && (!best || n > best.prefix.length))
            best = { lhs: a.lhs, prefix: a.rhs.slice(0, n) };
        }
    if (!best) return { grammar: rebuild(g, rules), trace };
    const { lhs, prefix } = best;
    let fresh = lhs + "'";
    while (rules.some((r) => r.lhs === fresh)) fresh += "'";
    const grouped = rules.filter(
      (r) => r.lhs === lhs && prefix.every((s, i) => r.rhs[i] === s),
    );
    for (const r of grouped) rules.splice(rules.indexOf(r), 1);
    rules.push(
      { lhs, rhs: [...prefix, fresh] },
      ...grouped.map((r) => ({ lhs: fresh, rhs: r.rhs.slice(prefix.length) })),
    );
    trace.push(`Factor ${prefix.join(" ")} from ${lhs} into ${fresh}.`);
  }
  throw new CompilerError("Factoring exceeds the 50-transformation limit.");
}
