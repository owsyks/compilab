import { CompilerError, EPS, Grammar, inputTokens } from "./grammar";
export type Tree = { symbol: string; production?: number; children: Tree[] };
export type Derivation = { forms: string[][]; rules: number[]; tree: Tree };
export function derive(
  g: Grammar,
  rules: number[],
  direction: "left" | "right" = "left",
): Derivation {
  if (rules.length > 100)
    throw new CompilerError("Derivation limit: 100 rules.");
  const tree: Tree = { symbol: g.start, children: [] };
  let frontier = [tree];
  const forms = [[g.start]];
  for (const id of rules) {
    const indexes = frontier
      .map((n, i) => (g.nonterminals.includes(n.symbol) ? i : -1))
      .filter((i) => i >= 0);
    const index = direction === "left" ? indexes[0] : indexes.at(-1);
    const p = g.productions.find((p) => p.id === id);
    if (index === undefined || !p || p.lhs !== frontier[index].symbol)
      throw new CompilerError(
        `r${id} violates the ${direction}most derivation at step ${forms.length}.`,
      );
    const node = frontier[index];
    node.production = id;
    node.children = p.rhs.length
      ? p.rhs.map((symbol) => ({ symbol, children: [] }))
      : [{ symbol: EPS, children: [] }];
    frontier = [
      ...frontier.slice(0, index),
      ...node.children.filter((n) => n.symbol !== EPS),
      ...frontier.slice(index + 1),
    ];
    forms.push(frontier.map((n) => n.symbol));
  }
  return { forms, rules, tree };
}
export function searchDerivations(g: Grammar, text: string, maxResults = 2) {
  const target = inputTokens(g, text);
  if (target.length > 64)
    throw new CompilerError(
      "Bounded tree search supports at most 64 input tokens.",
    );
  const queue: { form: string[]; rules: number[] }[] = [
    { form: [g.start], rules: [] },
  ];
  const results: Derivation[] = [];
  let cursor = 0;
  let capped = false;
  const limit = 20000;
  while (
    cursor < queue.length &&
    cursor < limit &&
    results.length < maxResults
  ) {
    const { form, rules } = queue[cursor++];
    const index = form.findIndex((s) => g.nonterminals.includes(s));
    if (index < 0) {
      if (JSON.stringify(form) === JSON.stringify(target))
        results.push(derive(g, rules));
      continue;
    }
    if (rules.length >= 24 || form.length > target.length + 8) continue;
    if (form.filter((s) => !g.nonterminals.includes(s)).length > target.length)
      continue;
    if (form.slice(0, index).some((s, i) => s !== target[i])) continue;
    const lastNT = form.findLastIndex((s) => g.nonterminals.includes(s));
    const suffix = form.slice(lastNT + 1);
    if (suffix.some((s, i) => s !== target[target.length - suffix.length + i]))
      continue;
    for (const p of g.productions.filter((p) => p.lhs === form[index])) {
      if (queue.length >= limit) {
        capped = true;
        break;
      }
      queue.push({
        form: [...form.slice(0, index), ...p.rhs, ...form.slice(index + 1)],
        rules: [...rules, p.id],
      });
    }
  }
  return {
    results,
    ambiguity: results.length >= 2 ? "proven" : "not determined",
    explored: cursor,
    limited: capped || cursor >= limit || cursor < queue.length,
    maxDepth: 24,
  };
}
export function boundedLanguage(
  g: Grammar,
  maxLength = 5,
  maxDepth = 12,
): string[] {
  let current = [[g.start]];
  const seen = new Set<string>();
  const words = new Set<string>();
  for (let d = 0; d < maxDepth && current.length; d++) {
    const next: string[][] = [];
    for (const form of current) {
      const key = JSON.stringify(form);
      if (seen.has(key)) continue;
      seen.add(key);
      const index = form.findIndex((s) => g.nonterminals.includes(s));
      if (index < 0) {
        if (form.length <= maxLength) words.add(form.join(" "));
        continue;
      }
      if (
        form.filter((s) => !g.nonterminals.includes(s)).length > maxLength ||
        form.length > maxLength + 5
      )
        continue;
      for (const p of g.productions.filter((p) => p.lhs === form[index]))
        next.push([
          ...form.slice(0, index),
          ...p.rhs,
          ...form.slice(index + 1),
        ]);
    }
    current = next;
    if (seen.size > 20000)
      throw new CompilerError("Enumeration limit exceeded.");
  }
  return [...words].sort();
}
export type ExpressionAST = { symbol: string; children: ExpressionAST[] };
export function projectExpressionAST(tree: Tree): ExpressionAST {
  // Explicit projection for E -> E + E | E * E | ( E ) | C; C -> i | v.
  if (!tree.children.length) {
    if (["i", "v", "id"].includes(tree.symbol))
      return { symbol: tree.symbol, children: [] };
    throw new CompilerError(
      "AST projection expects expression leaves i, v or id.",
    );
  }
  if (tree.children.length === 1) return projectExpressionAST(tree.children[0]);
  if (
    tree.children.length === 3 &&
    tree.children[0].symbol === "(" &&
    tree.children[2].symbol === ")"
  )
    return projectExpressionAST(tree.children[1]);
  if (
    tree.children.length === 3 &&
    ["+", "*"].includes(tree.children[1].symbol)
  )
    return {
      symbol: tree.children[1].symbol,
      children: [
        projectExpressionAST(tree.children[0]),
        projectExpressionAST(tree.children[2]),
      ],
    };
  throw new CompilerError(
    "This tree does not match the explicitly supported expression AST projection.",
  );
}
