import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { modules } from "../src/lib/courses";
import { exerciseBank } from "../src/lib/exercises";
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
async function main() {
  for (const [position, m] of modules.entries()) {
    await db.module.upsert({
      where: { id: m.id },
      create: {
        id: m.id,
        title: m.title,
        titleEn: m.titleEn,
        description: m.description,
        position,
      },
      update: {
        title: m.title,
        titleEn: m.titleEn,
        description: m.description,
      },
    });
    for (const [order, l] of m.lessons.entries())
      await db.lesson.upsert({
        where: { id: l.id },
        create: {
          id: l.id,
          moduleId: m.id,
          slug: l.slug,
          title: l.title,
          titleEn: l.titleEn,
          duration: l.duration,
          position: order,
          content: JSON.parse(JSON.stringify(l.content)),
        },
        update: {
          title: l.title,
          titleEn: l.titleEn,
          content: JSON.parse(JSON.stringify(l.content)),
        },
      });
  }
  for (const e of exerciseBank)
    await db.exercise.upsert({
      where: { id: e.id },
      create: { ...e, body: JSON.parse(JSON.stringify(e.body)) },
      update: { body: JSON.parse(JSON.stringify(e.body)) },
    });
  let files: string[] = [];
  try {
    files = await readdir("content/sources/pages");
  } catch {
    console.log(
      "No private source pages. Run npm run sources:import to ingest local transcripts.",
    );
  }
  const catalog = JSON.parse(
    await readFile("content/sources/catalog.json", "utf8"),
  ) as { id: string; title: string; pageCount: number }[];
  for (const source of catalog) {
    // The adjacent conversation was inspected but does not match the Compilation syllabus.
    if (source.id !== "study-transcript") continue;
    if (!files.includes(source.id + ".json")) continue;
    const pages = JSON.parse(
      await readFile(
        join("content/sources/pages", source.id + ".json"),
        "utf8",
      ),
    ) as { page: number; text: string; topics: string[] }[];
    await db.sourceDocument.upsert({
      where: { id: source.id },
      create: {
        id: source.id,
        title: source.title,
        pageCount: source.pageCount,
      },
      update: { title: source.title, pageCount: source.pageCount },
    });
    for (const page of pages)
      for (let i = 0; i < page.text.length; i += 1500) {
        const position = Math.floor(i / 1500);
        const data = {
          sourceId: source.id,
          page: page.page,
          position,
          text: page.text.slice(i, i + 1800),
          topics: page.topics,
        };
        await db.sourceChunk.upsert({
          where: {
            sourceId_page_position: {
              sourceId: source.id,
              page: page.page,
              position,
            },
          },
          create: data,
          update: { text: data.text, topics: data.topics },
        });
      }
  }
  if (process.env.DEMO_ENABLED === "true") {
    if (process.env.NODE_ENV === "production")
      throw new Error("Demo seeding is disabled in production.");
    const password = await hash(
      process.env.DEMO_PASSWORD ?? "Compilab-demo-2026!",
      12,
    );
    for (const [id, name, role] of [
      ["demo-student", "Étudiant démo", "STUDENT"],
      ["demo-admin", "Content administrator", "ADMIN"],
    ]) {
      const email =
        role === "ADMIN" ? "admin@compilab.local" : "demo@compilab.local";
      await db.user.upsert({
        where: { email },
        create: { id, name, email, role, emailVerified: true },
        update: {},
      });
      const user = await db.user.findUniqueOrThrow({ where: { email } });
      await db.account.upsert({
        where: {
          providerId_accountId: {
            providerId: "credential",
            accountId: user.id,
          },
        },
        create: {
          id: id + "-credentials",
          providerId: "credential",
          accountId: user.id,
          userId: user.id,
          password,
        },
        update: { password },
      });
    }
  }
  console.log(
    `Seeded ${modules.length} modules, ${modules.reduce((s, m) => s + m.lessons.length, 0)} lessons and ${exerciseBank.length} exercises. Source chunks remain unverified.`,
  );
}
main()
  .finally(() => db.$disconnect())
  .catch(() => {
    console.error(
      "Seed failed. Check PostgreSQL, migrations and source file availability.",
    );
    process.exitCode = 1;
  });
