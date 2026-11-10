import { describe, it, expect } from "vitest";
import {
  parseGrammar,
  computeSets,
  buildLL1,
  parseLL1,
  eliminateLeftRecursion,
  leftRecursion,
  leftFactor,
  serialize,
} from "../src/lib/compiler/grammar";
import { buildLR, parseLR } from "../src/lib/compiler/lr";
import { scanFiche1, runDFA, identifierDFA } from "../src/lib/compiler/lexer";
import {
  boundedLanguage,
  derive,
  searchDerivations,
  projectExpressionAST,
} from "../src/lib/compiler/derivation";
import { EXPRESSION, LR_COUNTER } from "../src/lib/courses";
import {
  compareMembers,
  grade,
  exerciseBank,
  generateVerified,
} from "../src/lib/exercises";
import fixture from "./fixtures/cc-lr1.json";
describe("Fiche 1 and DFA", () => {
  it("recognizes exact keywords, stable symbols, integers and operators", () => {
    const r = scanFiche1(
      "Int a\nInt b\na := 10\nb := a\nSi a < 12 alors b := 0 sinon b := 1 fsi",
    );
    expect(r.errors).toEqual([]);
    expect(r.symbols).toEqual([
      { id: 1, name: "a" },
      { id: 2, name: "b" },
    ]);
    expect(r.tokens[0].kind).toBe("keyword");
    expect(r.tokens[5].kind).toBe("assignment");
    expect(
      r.tokens.filter((t) => t.kind === "keyword").map((t) => t.lexeme),
    ).toEqual(["Int", "Int", "Si", "alors", "sinon", "fsi"]);
  });
  it("enforces this sheet’s whitespace and error locations", () => {
    const r = scanFiche1("Int a\na:=10\n-3");
    expect(r.errors[0]).toMatchObject({ line: 2, column: 1, lexeme: "a:=10" });
    expect(r.errors).toHaveLength(2);
  });
  it("runs every character including sink transitions", () => {
    expect(runDFA(identifierDFA, "a_2").accepted).toBe(true);
    expect(runDFA(identifierDFA, "2a").accepted).toBe(false);
    expect(runDFA(identifierDFA, "").accepted).toBe(false);
    expect(runDFA(identifierDFA, "a@x").trace.at(-1)?.state).toBe("sink");
  });
});
describe("grammar and transformations", () => {
  it("normalizes compact productions, arrows, λ and quoted terminals", () => {
    expect(parseGrammar('S → aA | λ\nA -> "hello"').productions[0].rhs).toEqual(
      ["a", "A"],
    );
    expect(parseGrammar("A -> λ").productions[0].rhs).toEqual([]);
    expect(parseGrammar('S -> "|"').terminals).toEqual(["|"]);
  });
  it("rejects undefined references and ambiguous compact terminal words", () => {
    expect(() => parseGrammar("S -> A")).toThrow(/Undefined/);
    expect(() => parseGrammar("S -> abc")).toThrow(/Ambiguous/);
    expect(() => parseGrammar("S -> ε a")).toThrow();
  });
  it("detects unreachable, duplicate and indirect recursion", () => {
    const g = parseGrammar("S -> A\nA -> S | a\nU -> b | b");
    expect(leftRecursion(g)).toEqual(["S", "A"]);
    expect(g.warnings).toHaveLength(2);
  });
  it("eliminates direct left recursion, preserving bounded language", () => {
    const g = parseGrammar("A -> Aa | b");
    const out = eliminateLeftRecursion(g).grammar;
    expect(leftRecursion(out)).toEqual([]);
    expect(boundedLanguage(g, 5, 20)).toEqual(boundedLanguage(out, 5, 20));
  });
  it("eliminates indirect recursion and refuses unsafe nullable cycles", () => {
    const out = eliminateLeftRecursion(
      parseGrammar("S -> A a | b\nA -> S c | d"),
    ).grammar;
    expect(leftRecursion(out)).toEqual([]);
    expect(() => eliminateLeftRecursion(parseGrammar("A -> A | ε"))).toThrow();
  });
  it("repeatedly factors preserving every alternative, start symbol and ε", () => {
    const g = parseGrammar("S -> a b c | a b d | a\nA -> x");
    const out = leftFactor(g).grammar;
    expect(boundedLanguage(g)).toEqual(boundedLanguage(out));
    expect(serialize(out)).toContain("ε");
    expect(parseGrammar(serialize(out)).start).toBe("S");
  });
  it("does not interpret prototype property names as FIRST maps", () => {
    const g = parseGrammar('S -> "constructor" | "__proto__"');
    expect(computeSets(g).first.S).toEqual(["__proto__", "constructor"]);
  });
});
describe("FIRST FOLLOW LL1", () => {
  it("matches the complete expression fixture", () => {
    const sets = computeSets(parseGrammar(EXPRESSION));
    expect(sets.first).toEqual({
      E: ["(", "id"],
      "E'": ["+", "ε"],
      T: ["(", "id"],
      "T'": ["*", "ε"],
      F: ["(", "id"],
    });
    expect(sets.follow).toEqual({
      E: ["$", ")"],
      "E'": ["$", ")"],
      T: ["$", ")", "+"],
      "T'": ["$", ")", "+"],
      F: ["$", ")", "*", "+"],
    });
    expect(
      sets.trace.some(
        (t) => t.kind === "FOLLOW" && t.symbol === "T" && t.added === "$",
      ),
    ).toBe(true);
  });
  it("preserves competing rules with FIRST/FIRST evidence", () => {
    const ll = buildLL1(parseGrammar("S -> aA | aB\nA -> c\nB -> d"));
    expect(ll.conflicts).toEqual([
      { cell: "S|a", productions: [1, 2], kind: "FIRST/FIRST" },
    ]);
  });
  it("reports FIRST/FOLLOW conflicts", () => {
    expect(
      buildLL1(parseGrammar("S -> A a\nA -> a | ε")).conflicts[0].kind,
    ).toBe("FIRST/FOLLOW");
  });
  it("accepts an expression, rejects bad input and stops at conflicts", () => {
    const g = parseGrammar(EXPRESSION);
    expect(buildLL1(g).conflicts).toEqual([]);
    expect(parseLL1(g, "id + id * id").status).toBe("accept");
    expect(parseLL1(g, "id + * id").status).toBe("error");
    expect(parseLL1(parseGrammar("S -> a | a a"), "a").status).toBe("conflict");
  });
  it("propagates nullable chains and repeated occurrences to a fixed point", () => {
    const s = computeSets(parseGrammar("S -> A A B\nA -> a | ε\nB -> b | ε"));
    expect(s.follow.A).toEqual(["$", "a", "b"]);
    expect(s.first.S).toEqual(["a", "b", "ε"]);
    expect(s.follow.B).toEqual(["$"]);
    expect(computeSets(parseGrammar("S -> A\nA -> S")).first.S).toEqual([]);
  });
});
describe("derivations", () => {
  it("projects both ambiguous trees with an explicit expression interpretation", () => {
    const r = searchDerivations(
      parseGrammar("E -> E + E | E * E | i"),
      "i + i * i",
    );
    const asts = r.results.map((d) => projectExpressionAST(d.tree));
    expect(asts.map((a) => a.symbol).sort()).toEqual(["*", "+"]);
  });
  it("proves two structures without imposing precedence", () => {
    const r = searchDerivations(parseGrammar("E -> E+E | E*E | i"), "i+i*i");
    expect(r.results).toHaveLength(2);
    expect(r.ambiguity).toBe("proven");
    expect(JSON.stringify(r.results[0].tree)).not.toBe(
      JSON.stringify(r.results[1].tree),
    );
  });
  it("rejects direction violations and validates a rightmost sequence", () => {
    const g = parseGrammar("E -> A := B\nB -> A + B | id\nA -> id");
    expect(derive(g, [1, 2, 3, 4, 4], "right").forms.at(-1)).toEqual([
      "id",
      ":=",
      "id",
      "+",
      "id",
    ]);
    expect(() => derive(g, [1, 2], "left")).toThrow(/violates/);
  });
});
describe("LR family", () => {
  const g = parseGrammar("S -> C C\nC -> c C | d");
  it("matches every item and transition in the independent university LR1 reference", () => {
    const machine = buildLR(g, "LR1");
    const key = (items: string[]) => [...items].sort().join(";");
    const expected = fixture.states.map(key);
    const actual = machine.states.map((state) =>
      key(state.map((i) => `${i.production}/${i.dot}/${i.lookahead}`)),
    );
    expect([...actual].sort()).toEqual([...expected].sort());
    const remap = actual.map((s) => expected.indexOf(s));
    expect(
      machine.transitions
        .map((t) => JSON.stringify([remap[t.from], t.symbol, remap[t.to]]))
        .sort(),
    ).toEqual(fixture.transitions.map((t) => JSON.stringify(t)).sort());
  });
  it("matches an independent structural seven-state LR0 fixture", () => {
    const m = buildLR(g, "LR0");
    const fixture = [
      ["0:0", "1:0", "2:0", "3:0"],
      ["0:1"],
      ["1:1", "2:0", "3:0"],
      ["2:1", "2:0", "3:0"],
      ["3:1"],
      ["1:2"],
      ["2:2"],
    ].map((s) => s.sort().join(","));
    expect(
      m.states
        .map((s) =>
          s
            .map((i) => `${i.production}:${i.dot}`)
            .sort()
            .join(","),
        )
        .sort(),
    ).toEqual(fixture.sort());
    expect(m.conflicts).toEqual([]);
    expect(parseLR(g, m, "c d d").status).toBe("accept");
    expect(parseLR(g, m, "d").status).toBe("error");
  });
  it("distinguishes SLR from LR0", () => {
    const g = parseGrammar("E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id");
    expect(
      buildLR(g, "LR0").conflicts.some((c) => c.kind === "shift/reduce"),
    ).toBe(true);
    expect(buildLR(g, "SLR").conflicts).toEqual([]);
  });
  it("canonical LR1 accepts but real LALR merging introduces reduce/reduce", () => {
    const g = parseGrammar(LR_COUNTER);
    const lr = buildLR(g, "LR1"),
      lalr = buildLR(g, "LALR");
    expect(lr.conflicts).toEqual([]);
    expect(lalr.conflicts).toHaveLength(2);
    expect(lalr.conflicts.every((c) => c.kind === "reduce/reduce")).toBe(true);
    expect(lalr.states.length).toBeLessThan(lr.states.length);
    for (const input of ["d a", "d c", "b d c", "b d a"])
      expect(parseLR(g, lr, input).status).toBe("accept");
    expect(parseLR(g, lalr, "d a").status).toBe("conflict");
  });
  it("supports ε reductions and collision-safe augmentation", () => {
    const g = parseGrammar("S -> A\nS' -> b\nA -> a A | ε");
    for (const method of ["LR1", "SLR", "LALR"] as const) {
      const m = buildLR(g, method);
      expect(m.augmented).toBe("S''");
      expect(parseLR(g, m, "").status).toBe("accept");
      expect(parseLR(g, m, "a a").status).toBe("accept");
    }
  });
  it("is stable across repeated construction", () => {
    expect(buildLR(g, "LR1")).toEqual(buildLR(g, "LR1"));
  });
});
describe("grading", () => {
  it("independently verifies generation across difficulty levels and custom nullable grammars", () => {
    for (let difficulty = 1; difficulty <= 5; difficulty++) {
      const generated = generateVerified("ll1", difficulty, 10);
      expect(new Set(generated.map((e) => e.body.grammar)).size).toBe(10);
      for (const e of generated) {
        const sets = computeSets(parseGrammar(e.body.grammar!));
        expect(e.body.expected).toEqual(
          (e.body.variant === "FIRST" ? sets.first : sets.follow)[
            e.body.target!
          ],
        );
      }
    }
    const custom = generateVerified("ll1", 3, 10, {
      grammar: "S -> A B\nA -> a | ε\nB -> b | ε",
      type: "FOLLOW_sets",
      target: "A",
    });
    expect(custom).toHaveLength(1);
    expect(custom[0].body.expected).toEqual(["$", "b"]);
  });
  it("ignores set permutations and pinpoints missing and extra members", () => {
    expect(compareMembers(["+", ")", "$"], "{$, +, )}").score).toBe(1);
    expect(compareMembers(["+", ")", "$"], "+, ε")).toMatchObject({
      missing: ["$", ")"],
      extra: ["ε"],
    });
  });
  it("accepts every authored canonical answer", () => {
    for (const exercise of exerciseBank) {
      const answer =
        exercise.body.widget === "sequence"
          ? (exercise.body.expected as number[]).join(",")
          : exercise.body.expected;
      const feedback = grade(exercise.body, answer);
      expect(feedback.score, exercise.id).toBe(
        exercise.body.widget === "open" ? null : 1,
      );
    }
  });
});
