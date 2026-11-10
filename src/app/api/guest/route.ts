import { NextRequest, NextResponse } from "next/server";
import { buildGuestToken, cookieName } from "@/lib/visitor";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const guest = buildGuestToken();

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
    console.warn("DB offline on guest route creation, using signed cookie:", err);
  }

  const next = request.nextUrl.searchParams.get("next") ?? "/dashboard";
  const safe =
    /^\/(dashboard|learn|practice|lab|tutor|exams|review|progress|settings|onboarding)(\/|\?|$)/.test(
      next,
    ) && !next.includes("\\");
  const origin = request.nextUrl.origin;
  const response = NextResponse.redirect(
    new URL(safe ? next : "/dashboard", origin),
  );
  response.cookies.set(cookieName, guest.token, guest.cookieOptions);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

