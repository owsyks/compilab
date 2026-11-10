import { cookies, headers } from "next/headers";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { auth } from "./auth";
import { db } from "./db";

export const cookieName = "compilab-visitor";
export const lifetime = 60 * 60 * 24 * 30;

export function signature(value: string) {
  const secret =
    process.env.AUTH_SECRET ||
    "compilab-auth-secret-for-build-minimum-32-chars-ok";
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function buildGuestToken(guestId = `guest-${randomUUID()}`) {
  const expiry = Date.now() + lifetime * 1000;
  const value = `${guestId}.${expiry}`;
  const signed = signature(value);
  return {
    guestId,
    token: `${value}.${signed}`,
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      maxAge: lifetime,
      secure: process.env.BETTER_AUTH_URL?.startsWith("https://") ?? false,
    },
  };
}

export function makeGuestUser(guestId = `guest-${randomUUID()}`) {
  return {
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

  try {
    const store = await cookies();
    const token = store.get(cookieName)?.value ?? "";
    const [id, expiry, signed] = token.split(".");
    if (
      id?.startsWith("guest-") &&
      Number(expiry) > Date.now() &&
      /^[a-f0-9]{64}$/.test(signed ?? "")
    ) {
      const expected = signature(`${id}.${expiry}`);
      const expBuf = Buffer.from(expected);
      const signBuf = Buffer.from(signed);
      if (
        expBuf.length === signBuf.length &&
        timingSafeEqual(expBuf, signBuf)
      ) {
        try {
          const user = await db.user.findUnique({ where: { id } });
          if (user?.role === "GUEST") return user;
        } catch (err) {
          console.warn("DB offline on guest lookup:", err);
        }
        return makeGuestUser(id);
      }
    }
  } catch (err) {
    console.warn("Error reading guest visitor cookie:", err);
  }

  if (!create) return null;

  const guest = buildGuestToken();
  const guestUser = makeGuestUser(guest.guestId);

  try {
    await db.user.create({
      data: {
        id: guest.guestId,
        name: "Visiteur",
        email: `${guest.guestId}@visitor.invalid`,
        role: "GUEST",
        preferences: { onboarded: true, depth: "teach" },
      },
    });
  } catch (err) {
    console.warn("DB offline on guest creation, continuing with signed cookie:", err);
  }

  try {
    const store = await cookies();
    store.set(cookieName, guest.token, guest.cookieOptions);
  } catch (err) {
    console.warn("Could not set visitor cookie directly on store:", err);
  }
  return guestUser;
}

