import { describe, expect, it } from "vitest";
import { allLessons, LR_COUNTER, PRESETS } from "../src/lib/courses";
import {
  computeSets,
  parseGrammar,
  parseLL1,
} from "../src/lib/compiler/grammar";
import { buildLR, parseLR } from "../src/lib/compiler/lr";

describe("expanded lesson examples", () => {
  it("includes worked detail in every lesson in both languages", () => {
    expect(allLessons).toHaveLength(15);
    for (const lesson of allLessons) {
      expect(lesson.content.sections.length).toBeGreaterThanOrEqual(3);
      expect(
        lesson.content.sections.every((s) => s.text && s.textEn && s.headingEn),
      ).toBe(true);
      expect(
        lesson.content.sections.filter((s) => s.example).length,
      ).toBeGreaterThanOrEqual(2);
    }
  });
  it("checks the complete LR(0) worked collection and input trace", () => {
    const grammar = parseGrammar("S -> A\nA -> a A | b");
    const machine = buildLR(grammar, "LR0");
    expect(machine.states).toHaveLength(6);
    expect(machine.conflicts).toEqual([]);
    expect(parseLR(grammar, machine, "a a b").status).toBe("accept");
  });
  it("checks the SLR versus LR(1) context example", () => {
    const grammar = parseGrammar("S -> L = R | R\nL -> * R | id\nR -> L");
    expect(buildLR(grammar, "SLR").conflicts.length).toBeGreaterThan(0);
    expect(buildLR(grammar, "LR1").conflicts).toEqual([]);
  });
  it("checks the SLR improvement and LALR counterexample", () => {
    const expression = parseGrammar(
      PRESETS.find((p) => p.id === "slr")!.source,
    );
    expect(buildLR(expression, "LR0").conflicts.length).toBeGreaterThan(0);
    expect(buildLR(expression, "SLR").conflicts).toEqual([]);
    const counter = parseGrammar(LR_COUNTER);
    expect(buildLR(counter, "LR1").conflicts).toEqual([]);
    expect(buildLR(counter, "LALR").conflicts).toHaveLength(2);
  });
  it("checks nullable sets and the practice exam witness", () => {
    const sets = computeSets(parseGrammar("S -> A B\nA -> a | ε\nB -> b | ε"));
    expect(sets.first.S).toEqual(expect.arrayContaining(["a", "b", "ε"]));
    expect(sets.follow.A).toEqual(expect.arrayContaining(["b", "$"]));
    const grammar = parseGrammar("S -> a S b | ε");
    expect(parseLL1(grammar, "a a b b").status).toBe("accept");
    expect(parseLL1(grammar, "a a b").status).toBe("error");
  });
});
