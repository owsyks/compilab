import { NextRequest, NextResponse } from "next/server";
import { visitor } from "@/lib/visitor";

export async function GET(request: NextRequest) {
  try {
    await visitor(true);
  } catch (err) {
    console.warn("Visitor session initialization warning:", err);
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
  response.headers.set("Cache-Control", "no-store");
  return response;
}

