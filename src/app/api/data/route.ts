import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { visitor } from "@/lib/visitor";
import { db } from "@/lib/db";
import { ExerciseBody } from "@/lib/exercise-types";
import { exerciseBank, grade, publicExercise } from "@/lib/exercises";
import { modules } from "@/lib/courses";
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

const globalFallback = globalThis as unknown as {
  fallbackAttempts?: Map<string, any>;
  fallbackExams?: Map<string, any>;
  fallbackBookmarks?: Set<string>;
  fallbackProgress?: Set<string>;
  fallbackThreads?: Map<string, any>;
};
if (!globalFallback.fallbackAttempts)
  globalFallback.fallbackAttempts = new Map();
if (!globalFallback.fallbackExams) globalFallback.fallbackExams = new Map();
if (!globalFallback.fallbackBookmarks)
  globalFallback.fallbackBookmarks = new Set();
if (!globalFallback.fallbackProgress)
  globalFallback.fallbackProgress = new Set();
if (!globalFallback.fallbackThreads)
  globalFallback.fallbackThreads = new Map();

function getBuiltInLessons() {
  return modules.flatMap((m) =>
    m.lessons.map((l) => ({
      id: l.id,
      moduleId: m.id,
      slug: l.slug,
      title: l.title,
      titleEn: l.titleEn,
      duration: l.duration,
      content: l.content as unknown,
      published: true,
    })),
  );
}

function getBuiltInExercises() {
  return exerciseBank.map((e) => ({
    id: e.id,
    topic: e.topic,
    type: e.type,
    difficulty: e.difficulty,
    provenance: e.provenance,
    body: e.body as unknown,
  }));
}

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
  return (
    user ?? {
      id: "guest-default",
      name: "Visiteur",
      email: "guest@visitor.invalid",
      role: "GUEST",
      preferences: { onboarded: true, depth: "teach" },
      emailVerified: false,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  );
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
      let data: any = null;
      try {
        data = await db.user.findUnique({
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
      } catch (err) {
        console.warn("DB offline on export:", err);
      }
      return new NextResponse(JSON.stringify(data ?? user, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": 'attachment; filename="compilab-data.json"',
          "Cache-Control": "no-store",
        },
      });
    }
    if (action === "attempt") {
      let attempt: any = null;
      try {
        attempt = await db.exerciseAttempt.findFirst({
          where: {
            id: req.nextUrl.searchParams.get("id") ?? "",
            userId: user.id,
          },
          include: { exercise: true },
        });
      } catch (err) {
        console.warn("DB offline on attempt lookup:", err);
      }
      if (!attempt) {
        attempt = globalFallback.fallbackAttempts?.get(
          req.nextUrl.searchParams.get("id") ?? "",
        );
      }
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
      let exam: any = null;
      try {
        exam = await db.examAttempt.findFirst({
          where: {
            id: req.nextUrl.searchParams.get("id") ?? "",
            userId: user.id,
          },
        });
      } catch (err) {
        console.warn("DB offline on exam lookup:", err);
      }
      if (!exam) {
        exam = globalFallback.fallbackExams?.get(
          req.nextUrl.searchParams.get("id") ?? "",
        );
      }
      if (!exam)
        return NextResponse.json({ error: "Exam not found." }, { status: 404 });
      let exercises: any[] = [];
      try {
        exercises = await db.exercise.findMany({
          where: { id: { in: exam.exerciseIds } },
        });
      } catch (err) {
        console.warn("DB offline on exam exercises lookup:", err);
      }
      if (exercises.length === 0) {
        exercises = exerciseBank.filter((e) => exam.exerciseIds.includes(e.id));
      }
      return NextResponse.json({
        ...exam,
        exercises: exam.exerciseIds.map((id: string) => {
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
        sources: [],
        chunks: [],
        lessons: getBuiltInLessons(),
        exercises: getBuiltInExercises(),
        logs: [],
        audits: [],
        provider: {
          configured: !!process.env.NVIDIA_API_KEY,
          model:
            process.env.NVIDIA_MODEL ?? "nvidia/nemotron-3.5-lightning-30b-a3b",
        },
      });
    }

    let lessons: any[] = [];
    let progress: any[] = [];
    let attempts: any[] = [];
    let exams: any[] = [];
    let bookmarks: any[] = [];
    let events: any[] = [];
    let threads: any[] = [];
    let exercises: any[] = [];

    try {
      [
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
    } catch (err) {
      console.warn("DB offline during bootstrap, using built-in curriculum data:", err);
    }

    if (lessons.length === 0) {
      lessons = getBuiltInLessons();
    }
    if (exercises.length === 0) {
      exercises = getBuiltInExercises();
    }
    if (progress.length === 0 && globalFallback.fallbackProgress!.size > 0) {
      progress = Array.from(globalFallback.fallbackProgress!).map((lessonId) => ({
        lessonId,
        completed: true,
      }));
    }
    if (bookmarks.length === 0 && globalFallback.fallbackBookmarks!.size > 0) {
      bookmarks = Array.from(globalFallback.fallbackBookmarks!).map((lessonId) => ({
        lessonId,
      }));
    }
    if (attempts.length === 0 && globalFallback.fallbackAttempts!.size > 0) {
      attempts = Array.from(globalFallback.fallbackAttempts!.values()).filter(
        (a) => a.userId === user.id,
      );
    }
    if (exams.length === 0 && globalFallback.fallbackExams!.size > 0) {
      exams = Array.from(globalFallback.fallbackExams!.values()).filter(
        (e) => e.userId === user.id,
      );
    }
    if (threads.length === 0 && globalFallback.fallbackThreads!.size > 0) {
      threads = Array.from(globalFallback.fallbackThreads!.values()).filter(
        (t) => t.userId === user.id,
      );
    }


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
        attempts: attempts
          .filter((a) => a && typeof a === "object")
          .map((a) => {
            const ex = a.exercise ?? {};
            const body = (ex.body ?? {}) as ExerciseBody;
            return {
              ...a,
              exercise: {
                topic: ex.topic ?? "general",
                type: ex.type ?? "quiz",
                title: body.title ?? "Exercice",
                titleEn: body.titleEn ?? "Exercise",
              },
            };
          }),
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
    const reqOrigin = req.headers.get("origin");
    const configuredOrigin = new URL(
      process.env.BETTER_AUTH_URL ?? "http://127.0.0.1:3000",
    ).origin;
    if (
      reqOrigin &&
      reqOrigin !== configuredOrigin &&
      reqOrigin !== req.nextUrl.origin &&
      !reqOrigin.endsWith(".vercel.app")
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
      limited("guest-ai-global", 60);
    const event = (type: string, topic: string) =>
      db.learningEvent
        .create({ data: { userId: user.id, type, topic } })
        .catch(() => {});
    const attemptOwned = async (id: string) => {
      try {
        const at = await db.exerciseAttempt.findFirst({
          where: { id, userId: user.id },
          include: { exercise: true },
        });
        if (at) return at;
      } catch (err) {
        console.warn("DB offline on attemptOwned:", err);
      }
      const fb = globalFallback.fallbackAttempts?.get(id);
      if (fb && fb.userId === user.id) return fb;
      throw new ProviderError("NOT_FOUND", "Attempt not found.", 404);
    };

    if (a.op === "settings") {
      try {
        await db.user.update({
          where: { id: user.id },
          data: { preferences: a.preferences },
        });
      } catch (err) {
        console.warn("DB offline on settings update:", err);
      }
      return NextResponse.json({ ok: true });
    }
    if (a.op === "complete") {
      try {
        const lesson = await db.lesson.findFirst({
          where: { id: a.lessonId, published: true },
        });
        if (lesson) {
          await db.$transaction(async (tx) => {
            const old = await tx.lessonProgress.findUnique({
              where: {
                userId_lessonId: { userId: user.id, lessonId: a.lessonId },
              },
            });
            await tx.lessonProgress.upsert({
              where: {
                userId_lessonId: { userId: user.id, lessonId: a.lessonId },
              },
              create: {
                userId: user.id,
                lessonId: a.lessonId,
                completed: true,
              },
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
        }
      } catch (err) {
        console.warn("DB offline on complete lesson:", err);
      }
      globalFallback.fallbackProgress?.add(a.lessonId);
      return NextResponse.json({ ok: true });
    }
    if (a.op === "bookmark") {
      let saved = true;
      try {
        const where = {
          userId_lessonId: { userId: user.id, lessonId: a.lessonId },
        };
        const old = await db.userBookmark.findUnique({ where });
        if (old) {
          await db.userBookmark.delete({ where });
          saved = false;
        } else {
          await db.userBookmark.create({
            data: { userId: user.id, lessonId: a.lessonId },
          });
          saved = true;
        }
      } catch (err) {
        console.warn("DB offline on bookmark:", err);
        if (globalFallback.fallbackBookmarks?.has(a.lessonId)) {
          globalFallback.fallbackBookmarks.delete(a.lessonId);
          saved = false;
        } else {
          globalFallback.fallbackBookmarks?.add(a.lessonId);
          saved = true;
        }
      }
      return NextResponse.json({ saved });
    }
    if (a.op === "generate") {
      limited(user.id + ":generate", 10);
      const { exercises, mode } = await generateExercises({
        ...a,
        signal: req.signal,
      });
      for (const e of exercises)
        await db.exercise
          .create({
            data: { ...e, body: JSON.parse(JSON.stringify(e.body)) },
          })
          .catch(() => {});
      return NextResponse.json({
        exercises: exercises.map(publicExercise),
        mode,
      });
    }
    if (a.op === "start") {
      try {
        const exercise = await db.exercise.findFirst({
          where: { id: a.exerciseId, published: true },
        });
        if (exercise) {
          const at = await db.exerciseAttempt.create({
            data: { userId: user.id, exerciseId: exercise.id },
          });
          return NextResponse.json({ id: at.id });
        }
      } catch (err) {
        console.warn("DB offline on start attempt:", err);
      }
      const ex = exerciseBank.find((e) => e.id === a.exerciseId);
      if (!ex) throw new ProviderError("NOT_FOUND", "Exercise not found.", 404);
      const atId = `att-${randomUUID()}`;
      const fallbackAttempt = {
        id: atId,
        userId: user.id,
        exerciseId: ex.id,
        exercise: ex,
        status: "started",
        answer: null,
        feedback: null,
        score: null,
        hintLevel: 0,
        createdAt: new Date().toISOString(),
        submittedAt: null,
      };
      globalFallback.fallbackAttempts?.set(atId, fallbackAttempt);
      return NextResponse.json({ id: atId });
    }
    if (a.op === "draft") {
      await attemptOwned(a.id);
      try {
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
      } catch (err) {
        console.warn("DB offline on draft update:", err);
      }
      const fb = globalFallback.fallbackAttempts?.get(a.id);
      if (fb) {
        fb.status = "draft";
        fb.answer = a.answer;
      }
      return NextResponse.json({ ok: true });
    }
    if (a.op === "hint") {
      const at = await attemptOwned(a.id);
      const level = Math.min(3, (at.hintLevel ?? 0) + 1);
      try {
        await db.exerciseAttempt.update({
          where: { id: at.id },
          data: { hintLevel: level },
        });
      } catch (err) {
        console.warn("DB offline on hint update:", err);
      }
      if (globalFallback.fallbackAttempts?.has(a.id)) {
        globalFallback.fallbackAttempts.get(a.id).hintLevel = level;
      }
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
      try {
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
        if (result.count)
          await event("exercise_submitted", at.exercise.topic);
      } catch (err) {
        console.warn("DB offline on submit:", err);
      }
      const fb = globalFallback.fallbackAttempts?.get(a.id);
      if (fb) {
        fb.answer = a.answer;
        fb.feedback = feedback;
        fb.score = feedback.score;
        fb.status = feedback.status;
        fb.submittedAt = new Date().toISOString();
      }
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
      let pool = exerciseBank.map((e) => ({
        ...e,
        body: e.body as ExerciseBody,
      }));
      try {
        const dbExercises = await db.exercise.findMany({
          where: { published: true, ...(a.topic ? { topic: a.topic } : {}) },
        });
        if (dbExercises.length > 0) {
          pool = dbExercises.map((e) => ({
            ...e,
            body: e.body as ExerciseBody,
          }));
        }
      } catch (err) {
        console.warn("DB offline on examStart query:", err);
      }
      const selected = pool
        .filter((e) => (a.topic ? e.topic === a.topic : true))
        .filter((e) => e.body.widget !== "open")
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
      const examTitle = a.practice ? "Pratique ciblée" : "Examen blanc";
      try {
        const exam = await db.examAttempt.create({
          data: {
            userId: user.id,
            title: examTitle,
            minutes: a.minutes,
            practice: a.practice,
            exerciseIds: selected.map((e) => e.id),
          },
        });
        return NextResponse.json({ id: exam.id });
      } catch (err) {
        console.warn("DB offline on examStart create:", err);
        const examId = `exam-${randomUUID()}`;
        globalFallback.fallbackExams?.set(examId, {
          id: examId,
          userId: user.id,
          title: examTitle,
          minutes: a.minutes,
          practice: a.practice,
          exerciseIds: selected.map((s) => s.id),
          answers: {},
          feedback: null,
          score: null,
          status: "started",
          createdAt: new Date().toISOString(),
          submittedAt: null,
          exercises: selected.map(asPublic),
        });
        return NextResponse.json({ id: examId });
      }
    }
    if (a.op === "examSave" || a.op === "examSubmit") {
      let exam: any = null;
      try {
        exam = await db.examAttempt.findFirst({
          where: { id: a.id, userId: user.id },
        });
      } catch (err) {
        console.warn("DB offline on exam query:", err);
      }
      if (!exam) {
        exam = globalFallback.fallbackExams?.get(a.id);
      }
      if (!exam || exam.userId !== user.id)
        throw new ProviderError("NOT_FOUND", "Exam not found.", 404);
      if (exam.status === "submitted") return NextResponse.json(exam);
      const answers = Object.fromEntries(
        Object.entries(a.answers).filter(([id]) =>
          exam.exerciseIds.includes(id),
        ),
      );
      if (a.op === "examSave") {
        try {
          await db.examAttempt.updateMany({
            where: { id: exam.id, userId: user.id, status: "started" },
            data: { answers: JSON.parse(JSON.stringify(answers)) },
          });
        } catch (err) {
          console.warn("DB offline on examSave:", err);
        }
        if (globalFallback.fallbackExams?.has(exam.id)) {
          globalFallback.fallbackExams.get(exam.id).answers = answers;
        }
        return NextResponse.json({ ok: true });
      }
      let exercises: any[] = [];
      try {
        exercises = await db.exercise.findMany({
          where: { id: { in: exam.exerciseIds } },
        });
      } catch (err) {
        console.warn("DB offline on exam exercises fetch:", err);
      }
      if (exercises.length === 0) {
        exercises = exerciseBank.filter((e) => exam.exerciseIds.includes(e.id));
      }
      const feedback = exam.exerciseIds.map((id: string) => ({
        id,
        ...grade(
          exercises.find((e) => e.id === id)!.body as ExerciseBody,
          answers[id],
          a.language,
        ),
        skipped: answers[id] === undefined || answers[id] === "",
      }));
      const score =
        feedback.reduce((s: number, f: any) => s + (f.score ?? 0), 0) /
        feedback.length;
      try {
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
      } catch (err) {
        console.warn("DB offline on examSubmit:", err);
      }
      if (globalFallback.fallbackExams?.has(exam.id)) {
        const fb = globalFallback.fallbackExams.get(exam.id);
        fb.status = "submitted";
        fb.answers = answers;
        fb.feedback = feedback;
        fb.score = score;
        fb.submittedAt = new Date().toISOString();
      }
      return NextResponse.json({ score, feedback });
    }

    if (a.op === "chat") {
      limited(user.id + ":ai", 12);
      try {
        const count = await db.examAttempt.count({
          where: { userId: user.id, status: "started", practice: false },
        });
        if (count > 0)
          throw new ProviderError(
            "EXAM_LOCK",
            "Submit your active exam before using tutor assistance.",
            403,
          );
      } catch (err) {
        if (err instanceof ProviderError) throw err;
        console.warn("DB offline on exam lock check:", err);
      }
      let thread: any = null;
      if (a.threadId) {
        try {
          thread = await db.tutorThread.findFirst({
            where: { id: a.threadId, userId: user.id },
            include: { messages: { orderBy: { createdAt: "desc" }, take: 12 } },
          });
        } catch (err) {
          console.warn("DB offline on thread lookup:", err);
        }
        if (!thread) {
          thread = globalFallback.fallbackThreads?.get(a.threadId);
        }
        if (!thread) {
          thread = {
            id: a.threadId,
            userId: user.id,
            title: a.message.slice(0, 40),
            messages: [],
          };
          globalFallback.fallbackThreads?.set(a.threadId, thread);
        }
      }

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
        let evidence: any = undefined;
        if (a.mode === "study-path") {
          try {
            evidence = await db.exerciseAttempt.findMany({
              where: { userId: user.id, submittedAt: { not: null } },
              select: {
                score: true,
                exercise: { select: { topic: true } },
                updatedAt: true,
              },
              take: 20,
              orderBy: { updatedAt: "desc" },
            });
          } catch (err) {
            console.warn("DB offline on evidence lookup:", err);
          }
        }
        const start = Date.now();
        let status = "ok";
        try {
          const history: Message[] = (thread?.messages ?? [])
            .reverse()
            .slice(-10)
            .map((m: any) => ({
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
          await db.aiRequestLog
            .create({
              data: {
                userId: user.id,
                operation: a.mode,
                model:
                  process.env.NVIDIA_MODEL ??
                  "nvidia/nemotron-3.5-lightning-30b-a3b",
                status,
                durationMs: Date.now() - start,
              },
            })
            .catch(() => {});
        }
      }
      const id = thread?.id ?? randomUUID();
      try {
        await db.$transaction(async (tx) => {
          if (!thread || !thread.createdAt)
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
      } catch (err) {
        console.warn("DB offline on tutor thread save:", err);
      }

      const existingThread = globalFallback.fallbackThreads?.get(id) ?? {
        id,
        userId: user.id,
        title: a.message.slice(0, 100),
        messages: [],
      };
      existingThread.messages.push({
        id: randomUUID(),
        role: "user",
        content: a.message,
      });
      existingThread.messages.push({
        id: randomUUID(),
        role: "assistant",
        content,
        citations,
      });
      globalFallback.fallbackThreads?.set(id, existingThread);

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
