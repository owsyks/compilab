import { cookies, headers } from "next/headers";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { auth } from "./auth";
import { db } from "./db";

const cookieName = "compilab-visitor";
const lifetime = 60 * 60 * 24 * 30;

function signature(value: string) {
  const secret =
    process.env.AUTH_SECRET ||
    "compilab-auth-secret-for-build-minimum-32-chars-ok";
  return createHmac("sha256", secret).update(value).digest("hex");
}

export async function visitor(create = false) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session) {
      try {
        const user = await db.user.findUnique({
          where: { id: session.user.id },
        });
        if (user) return user;
      } catch (err) {
        console.warn("DB offline on session lookup:", err);
      }
      return {
        id: session.user.id,
        name: session.user.name || "Étudiant",
        email: session.user.email,
        role: "STUDENT",
        preferences: { onboarded: true, depth: "teach" },
        emailVerified: false,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  } catch {
    // Auth or DB offline, continue to visitor cookie check
  }

  const store = await cookies();
  const token = store.get(cookieName)?.value ?? "";
  const [id, expiry, signed] = token.split(".");
  if (
    id?.startsWith("guest-") &&
    Number(expiry) > Date.now() &&
    /^[a-f0-9]{64}$/.test(signed ?? "")
  ) {
    const expected = signature(`${id}.${expiry}`);
    if (timingSafeEqual(Buffer.from(expected), Buffer.from(signed))) {
      try {
        const user = await db.user.findUnique({ where: { id } });
        if (user?.role === "GUEST") return user;
      } catch (err) {
        console.warn("DB offline on guest lookup:", err);
      }
      return {
        id,
        name: "Visiteur",
        email: `${id}@visitor.invalid`,
        role: "GUEST",
        preferences: { onboarded: true, depth: "teach" },
        emailVerified: false,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  if (!create) return null;

  const guestId = `guest-${randomUUID()}`;
  const guestUser = {
    id: guestId,
    name: "Visiteur",
    email: `${guestId}@visitor.invalid`,
    role: "GUEST",
    preferences: { onboarded: true, depth: "teach" },
    emailVerified: false,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    await db.user.create({
      data: {
        id: guestId,
        name: "Visiteur",
        email: `${guestId}@visitor.invalid`,
        role: "GUEST",
        preferences: { onboarded: true, depth: "teach" },
      },
    });
  } catch (err) {
    console.warn("DB offline on guest creation, continuing with signed cookie:", err);
  }

  const value = `${guestId}.${Date.now() + lifetime * 1000}`;
  store.set(cookieName, `${value}.${signature(value)}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: lifetime,
    secure: process.env.BETTER_AUTH_URL?.startsWith("https://") ?? false,
  });
  return guestUser;
}

