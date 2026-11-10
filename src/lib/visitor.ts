import { cookies, headers } from "next/headers";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { auth } from "./auth";
import { db } from "./db";

const cookieName = "compilab-visitor";
const lifetime = 60 * 60 * 24 * 30;
function signature(value: string) {
  if (!process.env.AUTH_SECRET) throw new Error("AUTH_SECRET is required.");
  return createHmac("sha256", process.env.AUTH_SECRET)
    .update(value)
    .digest("hex");
}
export async function visitor(create = false) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) return db.user.findUnique({ where: { id: session.user.id } });
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
      const user = await db.user.findUnique({ where: { id } });
      if (user?.role === "GUEST") return user;
    }
  }
  if (!create) return null;
  const guestId = `guest-${randomUUID()}`;
  const user = await db.user.create({
    data: {
      id: guestId,
      name: "Visiteur",
      email: `${guestId}@visitor.invalid`,
      role: "GUEST",
      preferences: { onboarded: true, depth: "teach" },
    },
  });
  const value = `${guestId}.${Date.now() + lifetime * 1000}`;
  store.set(cookieName, `${value}.${signature(value)}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: lifetime,
    secure: process.env.BETTER_AUTH_URL?.startsWith("https://") ?? false,
  });
  return user;
}
