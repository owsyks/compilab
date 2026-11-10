import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { visitor } from "@/lib/visitor";
import { db } from "@/lib/db";
import { ExerciseBody } from "@/lib/exercise-types";
import { grade, publicExercise } from "@/lib/exercises";
import {
  buildLL1,
  computeSets,
  parseGrammar,
  parseLL1,
} from "@/lib/compiler/grammar";
import { buildLR, parseLR, itemText } from "@/lib/compiler/lr";
import { scanFiche1 } from "@/lib/compiler/lexer";
import {
  generateExercises,
  retrieveSources,
  checkProviderHealth,
  gradeOpenResponse,
} from "@/lib/ai/services";
import {
  nimCompletion,
  ProviderError,
  TUTOR_RULES,
  Message,
} from "@/lib/ai/provider";
import { randomUUID } from "node:crypto";

const str = z.string().min(1).max(120);
const json = z.unknown();
const actionSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("complete"), lessonId: str }),
  z.object({ op: z.literal("bookmark"), lessonId: str }),
  z.object({
    op: z.literal("settings"),
    preferences: z.object({
      language: z.enum(["fr", "en"]),
      theme: z.enum(["light", "dark"]),
      depth: z.enum(["brief", "teach"]),
      goal: z.enum(["learn", "td", "exam"]),
      minutes: z.number().int().min(5).max(180),
      familiarity: z.enum(["beginner", "some", "confident"]),
      reducedMotion: z.boolean(),
      onboarded: z.boolean(),
    }),
  }),
  z.object({
    op: z.literal("generate"),
    topic: z.enum([
      "",
      "introduction",
      "lexicale",
      "grammaires",
      "preparation",
      "ll1",
      "lr",
      "examens",
    ]),
    difficulty: z.number().int().min(1).max(5),
    count: z.number().int().min(1).max(10),
    language: z.enum(["fr", "en"]),
    type: z.string().max(100).optional(),
    grammar: z.string().max(4000).optional(),
    target: z.string().max(30).optional(),
  }),
  z.object({ op: z.literal("start"), exerciseId: str }),
  z.object({ op: z.literal("draft"), id: str, answer: json }),
  z.object({
    op: z.literal("submit"),
    id: str,
    answer: json,
    language: z.enum(["fr", "en"]),
  }),
  z.object({ op: z.literal("hint"), id: str }),
  z.object({ op: z.literal("aiGrade"), id: str }),
  z.object({
    op: z.literal("examStart"),
    minutes: z.union([
      z.literal(15),
      z.literal(30),
      z.literal(60),
      z.literal(90),
    ]),
    practice: z.boolean(),
    topic: z.string().max(30),
  }),
  z.object({
    op: z.literal("examSave"),
    id: str,
    answers: z.record(z.string(), z.unknown()),
  }),
  z.object({
    op: z.literal("examSubmit"),
    id: str,
    answers: z.record(z.string(), z.unknown()),
    language: z.enum(["fr", "en"]),
  }),
  z.object({
    op: z.literal("chat"),
    threadId: z.string().max(120).optional(),
    message: z.string().min(1).max(4000),
    grammar: z.string().max(4000).optional(),
    language: z.enum(["fr", "en"]),
    depth: z.enum(["brief", "teach"]),
    mode: z.enum([
      "tutor",
      "computed",
      "teach",
      "hint",
      "explain-error",
      "study-path",
      "translate",
      "exam-review",
    ]),
  }),
  z.object({
    op: z.literal("deleteAccount"),
    confirmation: z.literal("DELETE"),
  }),
  z.object({ op: z.literal("health") }),
  z.object({
    op: z.literal("publish"),
    kind: z.enum(["lesson", "exercise"]),
    id: str,
    published: z.boolean(),
  }),
  z.object({
    op: z.literal("editLesson"),
    id: str,
    title: z.string().min(1).max(200),
    titleEn: z.string().min(1).max(200),
    content: z.object({
      outcomes: z.array(z.string().max(500)).max(12),
      outcomesEn: z.array(z.string().max(500)).max(12),
      vocabulary: z.record(z.string(), z.string().max(1000)),
      sections: z
        .array(
          z.object({
            heading: z.string().max(200),
            headingEn: z.string().max(200),
            text: z.string().max(10000),
            textEn: z.string().max(10000),
            example: z.string().max(4000).optional(),
          }),
        )
        .min(1)
        .max(20),
      pitfall: z.string().max(1000),
      pitfallEn: z.string().max(1000),
      lab: z
        .string()
        .regex(/^\/(lab\/(lexer|automata|grammar|first-follow|ll1|lr)|exams)$/),
      grammar: z.string().max(4000).optional(),
      prerequisite: z.array(str).max(30),
      source: z
        .object({ id: str, page: z.number().int().positive() })
        .optional(),
    }),
  }),
  z.object({ op: z.literal("verifyChunk"), id: str, verified: z.boolean() }),
  z.object({
    op: z.literal("solver"),
    kind: z.enum(["lexer", "sets", "ll1", "lr"]),
    source: z.string().max(12000),
    input: z.string().max(3000).optional(),
    method: z.enum(["LR0", "SLR", "LR1", "LALR"]).optional(),
  }),
]);
const buckets = new Map<string, { count: number; at: number }>();
function limited(key: string, max = 80) {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now - entry.at > 60000) {
    buckets.set(key, { count: 1, at: now });
    if (buckets.size > 5000)
      for (const [k, v] of buckets) if (now - v.at > 60000) buckets.delete(k);
    return;
  }
  if (++entry.count > max)
    throw new ProviderError(
      "RATE_LIMIT",
      "Too many requests. Please wait a minute.",
      429,
    );
}
const asPublic = (e: {
  id: string;
  topic: string;
  type: string;
  difficulty: number;
  provenance: string;
  body: unknown;
}) => publicExercise({ ...e, body: e.body as ExerciseBody });
async function identity() {
  const user = await visitor(true);
  if (!user) throw new ProviderError("UNAUTHENTICATED", "Please sign in.", 401);
  return user;
}
function errorResponse(error: unknown) {
  if (error instanceof ProviderError)
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  if (error instanceof z.ZodError)
    return NextResponse.json(
      {
        error:
          "Invalid request. " +
          error.issues
            .map((i) => i.path.join(".") + ": " + i.message)
            .join("; "),
      },
      { status: 400 },
    );
  if (error instanceof Error && error.name === "CompilerError")
    return NextResponse.json({ error: error.message }, { status: 400 });
  console.error(
    JSON.stringify({
      event: "api_error",
      type: error instanceof Error ? error.name : "unknown",
    }),
  );
  return NextResponse.json(
    {
      error:
        "The request could not be completed. Check the server and database, then retry.",
    },
    { status: 500 },
  );
}
export async function GET(req: NextRequest) {
  try {
    const user = await identity();
    limited(user.id);
    const action = req.nextUrl.searchParams.get("action") ?? "bootstrap";
    if (action === "export") {
      const data = await db.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          name: true,
          email: true,
          preferences: true,
          createdAt: true,
          progress: true,
          attempts: true,
          exams: true,
          bookmarks: true,
          events: true,
          threads: { include: { messages: true } },
        },
      });
      return new NextResponse(JSON.stringify(data, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": 'attachment; filename="compilab-data.json"',
          "Cache-Control": "no-store",
        },
      });
    }
    if (action === "attempt") {
      const attempt = await db.exerciseAttempt.findFirst({
        where: {
          id: req.nextUrl.searchParams.get("id") ?? "",
          userId: user.id,
        },
        include: { exercise: true },
      });
      if (!attempt)
        return NextResponse.json(
          { error: "Attempt not found." },
          { status: 404 },
        );
      return NextResponse.json({
        ...attempt,
        exercise: asPublic(attempt.exercise),
      });
    }
    if (action === "exam") {
      const exam = await db.examAttempt.findFirst({
        where: {
          id: req.nextUrl.searchParams.get("id") ?? "",
          userId: user.id,
        },
      });
      if (!exam)
        return NextResponse.json({ error: "Exam not found." }, { status: 404 });
      const exercises = await db.exercise.findMany({
        where: { id: { in: exam.exerciseIds } },
      });
      return NextResponse.json({
        ...exam,
        exercises: exam.exerciseIds.map((id) => {
          const exercise = asPublic(exercises.find((e) => e.id === id)!);
          return {
            ...exercise,
            hints:
              exam.practice || exam.status === "submitted"
                ? exercise.hints
                : [],
          };
        }),
      });
    }
    if (action === "admin") {
      if (user.role !== "ADMIN")
        return NextResponse.json(
          { error: "Administrator access required." },
          { status: 403 },
        );
      return NextResponse.json({
        sources: await db.sourceDocument.findMany({
          include: { _count: { select: { chunks: true } } },
        }),
        chunks: await db.sourceChunk.findMany({
          take: 40,
          orderBy: [{ sourceId: "asc" }, { page: "asc" }, { position: "asc" }],
        }),
        lessons: await db.lesson.findMany({ orderBy: { id: "asc" } }),
        exercises: await db.exercise.findMany({
          select: {
            id: true,
            topic: true,
            type: true,
            published: true,
            provenance: true,
          },
        }),
        logs: await db.aiRequestLog.findMany({
          take: 30,
          orderBy: { createdAt: "desc" },
        }),
        audits: await db.adminAuditEvent.findMany({
          take: 20,
          orderBy: { createdAt: "desc" },
        }),
        provider: {
          configured: !!process.env.NVIDIA_API_KEY,
          model:
            process.env.NVIDIA_MODEL ?? "nvidia/nemotron-3.5-lightning-30b-a3b",
        },
      });
    }
    const [
      lessons,
      progress,
      attempts,
      exams,
      bookmarks,
      events,
      threads,
      exercises,
    ] = await Promise.all([
      db.lesson.findMany({
        where: { published: true, module: { published: true } },
        orderBy: [{ moduleId: "asc" }, { position: "asc" }],
      }),
      db.lessonProgress.findMany({ where: { userId: user.id } }),
      db.exerciseAttempt.findMany({
        where: { userId: user.id },
        include: {
          exercise: { select: { topic: true, type: true, body: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      db.examAttempt.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      db.userBookmark.findMany({ where: { userId: user.id } }),
      db.learningEvent.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      db.tutorThread.findMany({
        where: { userId: user.id },
        include: { messages: { orderBy: { createdAt: "asc" } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      db.exercise.findMany({
        where: { published: true },
        take: 200,
        orderBy: { createdAt: "asc" },
      }),
    ]);
    return NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          preferences: user.preferences,
        },
        lessons,
        progress,
        attempts: attempts.map((a) => ({
          ...a,
          exercise: {
            topic: a.exercise.topic,
            type: a.exercise.type,
            title: (a.exercise.body as ExerciseBody).title,
            titleEn: (a.exercise.body as ExerciseBody).titleEn,
          },
        })),
        exams,
        bookmarks,
        events,
        threads,
        exercises: exercises.map(asPublic),
        providerConfigured: !!process.env.NVIDIA_API_KEY,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(req: NextRequest) {
  try {
    if (
      req.headers.get("origin") !==
      new URL(process.env.BETTER_AUTH_URL ?? "http://127.0.0.1:3000").origin
    )
      return NextResponse.json(
        { error: "Invalid request origin." },
        { status: 403 },
      );
    if (Number(req.headers.get("content-length") ?? 0) > 100000)
      return NextResponse.json(
        { error: "Request too large." },
        { status: 413 },
      );
    const user = await identity();
    limited(user.id);
    const raw = await req.text();
    if (raw.length > 100000)
      return NextResponse.json(
        { error: "Request too large." },
        { status: 413 },
      );
    const a = actionSchema.parse(JSON.parse(raw));
    if (user.role === "GUEST" && ["chat", "generate", "aiGrade"].includes(a.op))
      limited("guest-ai-global", 20);
    const event = (type: string, topic: string) =>
      db.learningEvent.create({ data: { userId: user.id, type, topic } });
    const attemptOwned = async (id: string) => {
      const at = await db.exerciseAttempt.findFirst({
        where: { id, userId: user.id },
        include: { exercise: true },
      });
      if (!at) throw new ProviderError("NOT_FOUND", "Attempt not found.", 404);
      return at;
    };
    if (a.op === "settings") {
      await db.user.update({
        where: { id: user.id },
        data: { preferences: a.preferences },
      });
      return NextResponse.json({ ok: true });
    }
    if (a.op === "complete") {
      const lesson = await db.lesson.findFirst({
        where: { id: a.lessonId, published: true },
      });
      if (!lesson)
        throw new ProviderError("NOT_FOUND", "Lesson not found.", 404);
      await db.$transaction(async (tx) => {
        const old = await tx.lessonProgress.findUnique({
          where: { userId_lessonId: { userId: user.id, lessonId: a.lessonId } },
        });
        await tx.lessonProgress.upsert({
          where: { userId_lessonId: { userId: user.id, lessonId: a.lessonId } },
          create: { userId: user.id, lessonId: a.lessonId, completed: true },
          update: { completed: true },
        });
        if (!old?.completed)
          await tx.learningEvent.create({
            data: {
              userId: user.id,
              type: "lesson_completed",
              topic: lesson.moduleId,
            },
          });
      });
      return NextResponse.json({ ok: true });
    }
    if (a.op === "bookmark") {
      const lesson = await db.lesson.findFirst({
        where: { id: a.lessonId, published: true },
      });
      if (!lesson)
        throw new ProviderError("NOT_FOUND", "Lesson not found.", 404);
      const where = {
        userId_lessonId: { userId: user.id, lessonId: a.lessonId },
      };
      const old = await db.userBookmark.findUnique({ where });
      if (old) await db.userBookmark.delete({ where });
      else
        await db.userBookmark.create({
          data: { userId: user.id, lessonId: a.lessonId },
        });
      return NextResponse.json({ saved: !old });
    }
    if (a.op === "generate") {
      limited(user.id + ":generate", 10);
      const { exercises, mode } = await generateExercises({
        ...a,
        signal: req.signal,
      });
      for (const e of exercises)
        await db.exercise.create({
          data: { ...e, body: JSON.parse(JSON.stringify(e.body)) },
        });
      return NextResponse.json({
        exercises: exercises.map(publicExercise),
        mode,
      });
    }
    if (a.op === "start") {
      const exercise = await db.exercise.findFirst({
        where: { id: a.exerciseId, published: true },
      });
      if (!exercise)
        throw new ProviderError("NOT_FOUND", "Exercise not found.", 404);
      const at = await db.exerciseAttempt.create({
        data: { userId: user.id, exerciseId: exercise.id },
      });
      return NextResponse.json({ id: at.id });
    }
    if (a.op === "draft") {
      await attemptOwned(a.id);
      await db.exerciseAttempt.updateMany({
        where: {
          id: a.id,
          userId: user.id,
          status: { in: ["started", "draft"] },
        },
        data: {
          status: "draft",
          answer: JSON.parse(JSON.stringify(a.answer ?? null)),
        },
      });
      return NextResponse.json({ ok: true });
    }
    if (a.op === "hint") {
      const at = await attemptOwned(a.id);
      const level = Math.min(3, at.hintLevel + 1);
      await db.exerciseAttempt.update({
        where: { id: at.id },
        data: { hintLevel: level },
      });
      return NextResponse.json({
        level,
        hint: (at.exercise.body as ExerciseBody).hints[level - 1],
      });
    }
    if (a.op === "submit") {
      const at = await attemptOwned(a.id);
      if (at.submittedAt) return NextResponse.json(at.feedback);
      const feedback = grade(
        at.exercise.body as ExerciseBody,
        a.answer,
        a.language,
      );
      const result = await db.exerciseAttempt.updateMany({
        where: { id: at.id, userId: user.id, submittedAt: null },
        data: {
          answer: JSON.parse(JSON.stringify(a.answer ?? null)),
          feedback: JSON.parse(JSON.stringify(feedback)),
          score: feedback.score,
          status: feedback.status,
          submittedAt: new Date(),
        },
      });
      if (result.count) await event("exercise_submitted", at.exercise.topic);
      else return NextResponse.json((await attemptOwned(a.id)).feedback);
      return NextResponse.json(feedback);
    }
    if (a.op === "aiGrade") {
      limited(user.id + ":ai", 12);
      const at = await attemptOwned(a.id);
      if (
        !at.submittedAt ||
        (at.exercise.body as ExerciseBody).widget !== "open"
      )
        throw new ProviderError(
          "INVALID",
          "Submit an open response first.",
          400,
        );
      const body = at.exercise.body as ExerciseBody;
      const advisory = await gradeOpenResponse({
        rubric: body.rubric,
        referenceSolution: body.explanation,
        answer: at.answer,
      });
      return NextResponse.json({ ...advisory, status: "needs_manual_review" });
    }
    if (a.op === "examStart") {
      const exercises = await db.exercise.findMany({
        where: { published: true, ...(a.topic ? { topic: a.topic } : {}) },
      });
      const selected = exercises
        .filter((e) => (e.body as ExerciseBody).widget !== "open")
        .sort(() => Math.random() - 0.5)
        .slice(
          0,
          a.minutes === 15
            ? 3
            : a.minutes === 30
              ? 6
              : a.minutes === 60
                ? 10
                : 14,
        );
      if (!selected.length)
        throw new ProviderError("EMPTY", "No matching exercises.", 400);
      const exam = await db.examAttempt.create({
        data: {
          userId: user.id,
          title: a.practice ? "Pratique ciblée" : "Examen blanc",
          minutes: a.minutes,
          practice: a.practice,
          exerciseIds: selected.map((e) => e.id),
        },
      });
      return NextResponse.json({ id: exam.id });
    }
    if (a.op === "examSave" || a.op === "examSubmit") {
      const exam = await db.examAttempt.findFirst({
        where: { id: a.id, userId: user.id },
      });
      if (!exam) throw new ProviderError("NOT_FOUND", "Exam not found.", 404);
      if (exam.status === "submitted") return NextResponse.json(exam);
      const answers = Object.fromEntries(
        Object.entries(a.answers).filter(([id]) =>
          exam.exerciseIds.includes(id),
        ),
      );
      if (a.op === "examSave") {
        await db.examAttempt.updateMany({
          where: { id: exam.id, userId: user.id, status: "started" },
          data: { answers: JSON.parse(JSON.stringify(answers)) },
        });
        return NextResponse.json({ ok: true });
      }
      const exercises = await db.exercise.findMany({
        where: { id: { in: exam.exerciseIds } },
      });
      const feedback = exam.exerciseIds.map((id) => ({
        id,
        ...grade(
          exercises.find((e) => e.id === id)!.body as ExerciseBody,
          answers[id],
          a.language,
        ),
        skipped: answers[id] === undefined || answers[id] === "",
      }));
      const score =
        feedback.reduce((s, f) => s + (f.score ?? 0), 0) / feedback.length;
      const result = await db.examAttempt.updateMany({
        where: { id: exam.id, userId: user.id, status: "started" },
        data: {
          status: "submitted",
          answers: JSON.parse(JSON.stringify(answers)),
          feedback: JSON.parse(JSON.stringify(feedback)),
          score,
          submittedAt: new Date(),
        },
      });
      if (result.count) await event("exam_submitted", "examens");
      else {
        const persisted = await db.examAttempt.findFirstOrThrow({
          where: { id: exam.id, userId: user.id },
        });
        return NextResponse.json({
          score: persisted.score,
          feedback: persisted.feedback,
        });
      }
      return NextResponse.json({ score, feedback });
    }
    if (a.op === "chat") {
      limited(user.id + ":ai", 12);
      if (
        await db.examAttempt.count({
          where: { userId: user.id, status: "started", practice: false },
        })
      )
        throw new ProviderError(
          "EXAM_LOCK",
          "Submit your active exam before using tutor assistance.",
          403,
        );
      const thread = a.threadId
        ? await db.tutorThread.findFirst({
            where: { id: a.threadId, userId: user.id },
            include: { messages: { orderBy: { createdAt: "desc" }, take: 12 } },
          })
        : null;
      if (a.threadId && !thread)
        throw new ProviderError("NOT_FOUND", "Conversation not found.", 404);
      const solver = a.grammar ? computeSets(parseGrammar(a.grammar)) : null;
      let content: string;
      let citations: Awaited<ReturnType<typeof retrieveSources>> = [];
      if (a.mode === "computed") {
        if (!solver)
          throw new ProviderError(
            "GRAMMAR_REQUIRED",
            "Enter a grammar to get a computed explanation.",
            400,
          );
        const match =
          /\b(FOLLOW|FIRST)\s*\(\s*([A-Z][A-Za-z0-9_']*)\s*\)/i.exec(a.message);
        const kind = match?.[1].toUpperCase() ?? "FOLLOW";
        const target = match?.[2] ?? parseGrammar(a.grammar!).start;
        const values =
          kind === "FIRST" ? solver.first[target] : solver.follow[target];
        if (!values)
          throw new ProviderError(
            "UNKNOWN_SYMBOL",
            "Unknown nonterminal.",
            400,
          );
        content =
          `**${a.language === "en" ? "Computed by the deterministic solver" : "Calculé par le solveur déterministe"}**\n\n${kind}(${target}) = {${values.join(", ")}}\n\n` +
          solver.trace
            .filter((t) => t.kind === kind && t.symbol === target)
            .map((t) => `- ${t.added}: ${t.reason}`)
            .join("\n");
      } else {
        citations = await retrieveSources(a.message);
        const preferences = user.preferences;
        const evidence =
          a.mode === "study-path"
            ? await db.exerciseAttempt.findMany({
                where: { userId: user.id, submittedAt: { not: null } },
                select: {
                  score: true,
                  exercise: { select: { topic: true } },
                  updatedAt: true,
                },
                take: 20,
                orderBy: { updatedAt: "desc" },
              })
            : undefined;
        const start = Date.now();
        let status = "ok";
        try {
          const history: Message[] = (thread?.messages ?? [])
            .reverse()
            .slice(-10)
            .map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content.slice(0, 1800),
            }));
          const parsingEvidence = a.grammar
            ? (() => {
                const g = parseGrammar(a.grammar!);
                return {
                  ll1: buildLL1(g).conflicts,
                  lr: (["LR0", "SLR", "LR1", "LALR"] as const).map((method) => {
                    try {
                      const m = buildLR(g, method);
                      return {
                        method,
                        stateCount: m.states.length,
                        conflicts: m.conflicts.slice(0, 8).map((c) => ({
                          ...c,
                          items: m.states[c.state]
                            .slice(0, 12)
                            .map((i) => itemText(m, i)),
                        })),
                        initialItems: m.states[0]
                          .slice(0, 20)
                          .map((i) => itemText(m, i)),
                      };
                    } catch {
                      return {
                        method,
                        classification: "unavailable: computational limit",
                      };
                    }
                  }),
                };
              })()
            : undefined;
          content = await nimCompletion(
            [
              { role: "system", content: TUTOR_RULES },
              ...history,
              {
                role: "user",
                content: JSON.stringify({
                  task: a.mode,
                  question: a.message,
                  language: a.language,
                  depth: a.depth,
                  exactGrammar: a.grammar,
                  computedSolver: solver,
                  parsingEvidence,
                  preferences,
                  masteryEvidence: evidence,
                  untrustedQuotedSources: citations,
                }),
              },
            ],
            { signal: req.signal },
          );
        } catch (error) {
          status = error instanceof ProviderError ? error.code : "error";
          throw error;
        } finally {
          await db.aiRequestLog.create({
            data: {
              userId: user.id,
              operation: a.mode,
              model:
                process.env.NVIDIA_MODEL ??
                "nvidia/nemotron-3.5-lightning-30b-a3b",
              status,
              durationMs: Date.now() - start,
            },
          });
        }
      }
      const id = thread?.id ?? randomUUID();
      await db.$transaction(async (tx) => {
        if (!thread)
          await tx.tutorThread.create({
            data: { id, userId: user.id, title: a.message.slice(0, 100) },
          });
        await tx.tutorMessage.create({
          data: { threadId: id, role: "user", content: a.message },
        });
        await tx.tutorMessage.create({
          data: {
            threadId: id,
            role: "assistant",
            content,
            citations: JSON.parse(
              JSON.stringify(
                citations.map(({ text: _, ...s }) => {
                  void _;
                  return s;
                }),
              ),
            ),
          },
        });
      });
      return NextResponse.json({ threadId: id, content, citations });
    }
    if (a.op === "deleteAccount") {
      await db.user.delete({ where: { id: user.id } });
      return NextResponse.json({ ok: true });
    }
    if (a.op === "solver") {
      limited(user.id + ":solver", 30);
      if (a.kind === "lexer") return NextResponse.json(scanFiche1(a.source));
      const g = parseGrammar(a.source);
      if (a.kind === "sets") return NextResponse.json(computeSets(g));
      if (a.kind === "ll1")
        return NextResponse.json({
          table: buildLL1(g),
          parse: a.input !== undefined ? parseLL1(g, a.input) : undefined,
        });
      const machine = buildLR(g, a.method ?? "SLR");
      return NextResponse.json({
        machine,
        parse: a.input !== undefined ? parseLR(g, machine, a.input) : undefined,
      });
    }
    if (user.role !== "ADMIN")
      throw new ProviderError(
        "FORBIDDEN",
        "Administrator access required.",
        403,
      );
    if (a.op === "health") {
      limited(user.id + ":health", 3);
      return NextResponse.json(await checkProviderHealth());
    }
    if (a.op === "publish") {
      if (a.kind === "lesson")
        await db.lesson.update({
          where: { id: a.id },
          data: { published: a.published },
        });
      else
        await db.exercise.update({
          where: { id: a.id },
          data: { published: a.published },
        });
      await db.adminAuditEvent.create({
        data: {
          userId: user.id,
          action: a.published ? "publish" : "unpublish",
          target: a.id,
        },
      });
      return NextResponse.json({ ok: true });
    }
    if (a.op === "editLesson") {
      if (a.content.grammar) parseGrammar(a.content.grammar);
      await db.lesson.update({
        where: { id: a.id },
        data: {
          title: a.title,
          titleEn: a.titleEn,
          content: JSON.parse(JSON.stringify(a.content)),
        },
      });
      await db.adminAuditEvent.create({
        data: { userId: user.id, action: "edit_lesson", target: a.id },
      });
      return NextResponse.json({ ok: true });
    }
    if (a.op === "verifyChunk") {
      await db.sourceChunk.update({
        where: { id: a.id },
        data: { verified: a.verified },
      });
      await db.adminAuditEvent.create({
        data: { userId: user.id, action: "verify_chunk", target: a.id },
      });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown operation." }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
}
