import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const run = promisify(execFile);
export async function POST(req: NextRequest) {
  let path: string | undefined;
  try {
    if (
      req.headers.get("origin") !==
      new URL(process.env.BETTER_AUTH_URL ?? "http://127.0.0.1:3000").origin
    )
      return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session)
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (user?.role !== "ADMIN")
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 },
      );
    if (
      (await db.adminAuditEvent.count({
        where: {
          userId: user.id,
          action: "import_pdf",
          createdAt: { gt: new Date(Date.now() - 3600000) },
        },
      })) >= 5
    )
      return NextResponse.json(
        { error: "Five PDF imports per hour maximum." },
        { status: 429 },
      );
    const size = Number(req.headers.get("content-length") ?? 0);
    if (size > 16000000)
      return NextResponse.json(
        { error: "PDF upload limit: 15 MB." },
        { status: 413 },
      );
    const raw = await req.arrayBuffer();
    if (raw.byteLength > 16000000)
      return NextResponse.json(
        { error: "PDF upload limit: 15 MB." },
        { status: 413 },
      );
    const bounded = new Request(req.url, {
      method: "POST",
      headers: req.headers,
      body: raw,
    });
    const form = await bounded.formData();
    const file = form.get("file");
    if (
      !(file instanceof File) ||
      file.type !== "application/pdf" ||
      file.size > 15000000 ||
      !file.name.toLowerCase().endsWith(".pdf")
    )
      return NextResponse.json(
        { error: "Choose a PDF up to 15 MB." },
        { status: 400 },
      );
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.subarray(0, 5).toString() !== "%PDF-")
      return NextResponse.json(
        { error: "Invalid PDF signature." },
        { status: 400 },
      );
    const dir = join(process.cwd(), ".local", "uploads");
    await mkdir(dir, { recursive: true });
    path = join(dir, randomUUID() + ".pdf");
    await writeFile(path, buffer);
    const { stdout } = await run(
      process.env.PYTHON_BIN ?? "python",
      [join(process.cwd(), "scripts", "parse_upload.py"), path],
      {
        timeout: 25000,
        maxBuffer: 16000000,
        windowsHide: true,
        encoding: "utf8",
      },
    );
    const extracted = JSON.parse(stdout) as {
      pageCount: number;
      pages: { page: number; text: string }[];
    };
    const source = await db.$transaction(
      async (tx) => {
        const doc = await tx.sourceDocument.create({
          data: {
            title: file.name.slice(0, 200),
            pageCount: extracted.pageCount,
          },
        });
        const chunks = extracted.pages.flatMap((page) => {
          const result: {
            sourceId: string;
            page: number;
            position: number;
            text: string;
            topics: string[];
          }[] = [];
          for (let i = 0; i < page.text.length; i += 1500)
            result.push({
              sourceId: doc.id,
              page: page.page,
              position: Math.floor(i / 1500),
              text: page.text.slice(i, i + 1800),
              topics: [],
            });
          return result;
        });
        if (chunks.length) await tx.sourceChunk.createMany({ data: chunks });
        await tx.adminAuditEvent.create({
          data: { userId: user.id, action: "import_pdf", target: doc.id },
        });
        return doc;
      },
      { timeout: 30000 },
    );
    return NextResponse.json({ id: source.id, pageCount: source.pageCount });
  } catch {
    return NextResponse.json(
      {
        error:
          "PDF import failed. Confirm that Python and PyMuPDF are installed and the file is unencrypted, readable and at most 500 pages.",
      },
      { status: 400 },
    );
  } finally {
    if (path) await unlink(path).catch(() => {});
  }
}
