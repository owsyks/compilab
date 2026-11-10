import { z } from "zod";
import { db } from "@/lib/db";
import { computeSets, parseGrammar } from "@/lib/compiler/grammar";
import {
  generateVerified,
  SeedExercise,
  compareMembers,
} from "@/lib/exercises";
import { nimCompletion, TUTOR_RULES } from "./provider";
export async function retrieveSources(query: string) {
  const terms = [
    ...new Set(query.toLowerCase().match(/[a-zà-ÿ]{3,}/g) ?? []),
  ].slice(0, 8);
  if (!terms.length) return [];
  const chunks = await db.sourceChunk.findMany({
    where: {
      OR: terms.map((term) => ({
        text: { contains: term, mode: "insensitive" as const },
      })),
    },
    include: { source: { select: { title: true } } },
    take: 200,
  });
  return chunks
    .map((c) => ({
      ...c,
      rank: terms.reduce(
        (n, t) => n + (c.text.toLowerCase().split(t).length - 1),
        0,
      ),
    }))
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 3)
    .map((c) => ({
      sourceId: c.sourceId,
      title: c.source.title,
      page: c.page,
      verified: c.verified,
      text: c.text.slice(0, 1600),
    }));
}
const generatedSchema = z.object({
  exercises: z
    .array(
      z.object({
        title: z.string().min(3).max(120),
        statement: z.string().min(5).max(1500),
        grammar: z.string().min(3).max(2000),
        kind: z.enum(["FIRST", "FOLLOW"]),
        target: z.string().max(30),
        answer: z.array(z.string().max(30)).max(40),
      }),
    )
    .min(1)
    .max(10),
});
export async function generateExercises(context: {
  topic: string;
  difficulty: number;
  count: number;
  language: string;
  type?: string;
  grammar?: string;
  target?: string;
  signal?: AbortSignal;
}) {
  if (
    context.topic !== "ll1" ||
    !process.env.NVIDIA_API_KEY ||
    context.type ||
    context.grammar
  )
    return {
      exercises: generateVerified(
        context.topic,
        context.difficulty,
        context.count,
        context,
      ),
      mode: "verified-bank" as const,
    };
  let repair = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const output = await nimCompletion(
        [
          {
            role: "system",
            content:
              TUTOR_RULES +
              ' Return only JSON matching {"exercises":[{"title":string,"statement":string,"grammar":string,"kind":"FIRST"|"FOLLOW","target":string,"answer":string[]}]}. Produce original FIRST/FOLLOW questions. Space-separate grammar symbols. Use uppercase nonterminals. Each exercise must ask for exactly ONE set: kind(target), never all sets or both FIRST and FOLLOW. answer must list the individual terminal symbols in that one set, not choices or set notation. Use ε for epsilon and $ for end of input. Example of a valid exercise: {"title":"FIRST(A)","statement":"Calculate FIRST(A).","grammar":"S -> A b\\nA -> a | ε","kind":"FIRST","target":"A","answer":["a","ε"]}. Compute the answer from the grammar before returning it. Write title and statement in the requested language.',
          },
          {
            role: "user",
            content: JSON.stringify({ ...context, signal: undefined, repair }),
          },
        ],
        { signal: context.signal, maxTokens: 2500 },
      );
      const json = generatedSchema.parse(
        JSON.parse(
          output.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, ""),
        ),
      );
      if (json.exercises.length !== context.count)
        throw new Error("Incorrect count");
      const seed = generateVerified("ll1", context.difficulty, 1)[0];
      const exercises: SeedExercise[] = json.exercises.map((e, i) => {
        const g = parseGrammar(e.grammar);
        if (!g.nonterminals.includes(e.target))
          throw new Error("Invalid target");
        const sets = computeSets(g);
        const expected =
          e.kind === "FIRST" ? sets.first[e.target] : sets.follow[e.target];
        if (compareMembers(expected, e.answer).score !== 1)
          throw new Error("Solver rejected answer");
        return {
          ...seed,
          id: crypto.randomUUID(),
          provenance: "NVIDIA-generated; independently solver-validated",
          body: {
            ...seed.body,
            title: e.title,
            titleEn: e.title,
            statement: e.statement,
            statementEn: e.statement,
            grammar: e.grammar,
            variant: e.kind,
            target: e.target,
            expected,
            explanation: sets.trace
              .filter((t) => t.kind === e.kind && t.symbol === e.target)
              .map((t) => `${t.added}: ${t.reason}`)
              .join("\n"),
            explanationEn: sets.trace
              .filter((t) => t.kind === e.kind && t.symbol === e.target)
              .map((t) => `${t.added}: ${t.reason}`)
              .join("\n"),
          },
          type: e.kind + "_sets",
          difficulty: context.difficulty + i * 0,
        };
      });
      return { exercises, mode: "nim-validated" as const };
    } catch {
      repair =
        "The last output was invalid or failed mathematical validation. Recompute every set and return the exact schema.";
    }
  }
  return {
    exercises: generateVerified(
      context.topic,
      context.difficulty,
      context.count,
    ),
    mode: "verified-bank-after-validation-failure" as const,
  };
}
export async function explainConcept(context: unknown) {
  return nimCompletion([
    { role: "system", content: TUTOR_RULES },
    {
      role: "user",
      content:
        "Explain this concept with the exact provided context: " +
        JSON.stringify(context),
    },
  ]);
}
export async function explainStep(context: unknown) {
  return nimCompletion([
    { role: "system", content: TUTOR_RULES },
    {
      role: "user",
      content: "Explain the exact computed step: " + JSON.stringify(context),
    },
  ]);
}
export async function giveHint(context: unknown) {
  return nimCompletion([
    { role: "system", content: TUTOR_RULES },
    {
      role: "user",
      content:
        "Give a non-spoiler hint, respecting the hint level: " +
        JSON.stringify(context),
    },
  ]);
}
export async function gradeOpenResponse(context: unknown) {
  const schema = z.object({
    feedback: z.string().max(5000),
    suggestedScore: z.number().min(0).max(1),
    uncertainty: z.string().min(1).max(1000),
  });
  const output = await nimCompletion([
    {
      role: "system",
      content:
        TUTOR_RULES +
        " Return JSON {feedback:string,suggestedScore:0..1,uncertainty:string}. This is advisory, requires manual review.",
    },
    { role: "user", content: JSON.stringify(context) },
  ]);
  return schema.parse(
    JSON.parse(output.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "")),
  );
}
export async function planNextPractice(context: unknown) {
  return explainConcept({
    task: "Recommend next practice using only observed mastery evidence",
    context,
  });
}
export async function checkProviderHealth() {
  await nimCompletion([{ role: "user", content: "Reply with OK." }], {
    maxTokens: 12,
  });
  return {
    reachable: true,
    model: process.env.NVIDIA_MODEL ?? "nvidia/nemotron-3.5-lightning-30b-a3b",
  };
}
