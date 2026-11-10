export const KEYWORDS = ["Int", "Si", "alors", "sinon", "fsi"];
export type Token = {
  lexeme: string;
  kind: "keyword" | "identifier" | "integer" | "assignment" | "comparison";
  offset: number;
  line: number;
  column: number;
  symbol?: number;
};
export type LexResult = {
  tokens: Token[];
  symbols: { id: number; name: string }[];
  errors: { lexeme: string; line: number; column: number; message: string }[];
  trace: { offset: number; character: string; state: string }[];
};
export function scanFiche1(source: string): LexResult {
  if (source.length > 12000)
    throw new Error("Source limit: 12,000 characters.");
  const result: LexResult = { tokens: [], symbols: [], errors: [], trace: [] };
  const position = (offset: number) => {
    const before = source.slice(0, offset).split("\n");
    return { line: before.length, column: before.at(-1)!.length + 1 };
  };
  for (const match of source.matchAll(/\S+/g)) {
    const lexeme = match[0];
    const offset = match.index!;
    const pos = position(offset);
    const kind: Token["kind"] | undefined = KEYWORDS.includes(lexeme)
      ? "keyword"
      : /^[A-Za-z][A-Za-z0-9_]*$/.test(lexeme)
        ? "identifier"
        : /^\d+$/.test(lexeme)
          ? "integer"
          : lexeme === ":="
            ? "assignment"
            : lexeme === "<"
              ? "comparison"
              : undefined;
    let state = "q0";
    for (let n = 0; n < lexeme.length; n++) {
      const c = lexeme[n];
      state =
        state === "sink"
          ? state
          : state === "q0"
            ? /[A-Za-z]/.test(c)
              ? "identifier"
              : /\d/.test(c)
                ? "integer"
                : c === ":"
                  ? "colon"
                  : c === "<"
                    ? "comparison"
                    : "sink"
            : state === "identifier"
              ? /[A-Za-z0-9_]/.test(c)
                ? state
                : "sink"
              : state === "integer"
                ? /\d/.test(c)
                  ? state
                  : "sink"
                : state === "colon" && c === "="
                  ? "assignment"
                  : "sink";
      result.trace.push({ offset: offset + n, character: c, state });
    }
    if (!kind) {
      result.errors.push({
        lexeme,
        ...pos,
        message:
          "Invalid lexeme for Fiche 1. Separate every lexeme with whitespace; allowed operators: := and <.",
      });
      continue;
    }
    let symbol: number | undefined;
    if (kind === "identifier") {
      let entry = result.symbols.find((s) => s.name === lexeme);
      if (!entry) {
        entry = { id: result.symbols.length + 1, name: lexeme };
        result.symbols.push(entry);
      }
      symbol = entry.id;
    }
    result.tokens.push({ lexeme, kind, offset, ...pos, symbol });
  }
  return result;
}
export type DFA = {
  states: string[];
  alphabet: string[];
  start: string;
  finals: string[];
  transitions: Record<string, string>;
};
export const identifierDFA: DFA = {
  states: ["q0", "q1", "sink"],
  alphabet: ["letter", "digit", "_", "other"],
  start: "q0",
  finals: ["q1"],
  transitions: {
    "q0|letter": "q1",
    "q0|digit": "sink",
    "q0|_": "sink",
    "q0|other": "sink",
    "q1|letter": "q1",
    "q1|digit": "q1",
    "q1|_": "q1",
    "q1|other": "sink",
    "sink|letter": "sink",
    "sink|digit": "sink",
    "sink|_": "sink",
    "sink|other": "sink",
  },
};
export function runDFA(dfa: DFA, input: string) {
  if (input.length > 3000) throw new Error("Input limit: 3,000 characters.");
  let state = dfa.start;
  const trace = [{ index: 0, state, character: "" }];
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    const symbol = dfa.alphabet.includes(c)
      ? c
      : /[A-Za-z]/.test(c)
        ? "letter"
        : /\d/.test(c)
          ? "digit"
          : c === "_"
            ? "_"
            : "other";
    state = dfa.transitions[`${state}|${symbol}`] ?? "sink";
    trace.push({ index: i + 1, state, character: c });
  }
  return { accepted: dfa.finals.includes(state), trace };
}
