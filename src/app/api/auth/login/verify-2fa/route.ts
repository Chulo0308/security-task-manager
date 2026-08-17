import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { setSessionCookie } from "@/lib/auth";
import { verifyTwoFactorChallenge, verifyTotpCode } from "@/lib/twofa";
import { createSession } from "@/lib/sessions";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const challenge = String(body.challenge || "");
    const code = String(body.code || "").trim();

    const userId = await verifyTwoFactorChallenge(challenge);
    if (!userId) {
      return NextResponse.json({ error: "Session expired, please log in again" }, { status: 401 });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user || !user.totpEnabled || !user.totpSecret) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (!verifyTotpCode(user.totpSecret, code)) {
      return NextResponse.json({ error: "Incorrect code" }, { status: 401 });
    }

    const sessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as "admin" | "supervisor" | "operator" | "guard",
      title: user.title,
      site: user.site,
    };
    const sid = await createSession(user.id, req);
    await setSessionCookie(sessionUser, sid);
    return NextResponse.json({ user: sessionUser });
  } catch (e) {
    return NextResponse.json({ error: "Server error", detail: String(e) }, { status: 500 });
  }
}
