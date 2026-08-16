import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { verifyTotpCode } from "@/lib/twofa";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const code = String(body.code || "").trim();

  const [user] = await db.select().from(users).where(eq(users.id, session.id)).limit(1);
  if (!user?.totpSecret) return NextResponse.json({ error: "No setup in progress" }, { status: 400 });

  if (!verifyTotpCode(user.totpSecret, code)) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  await db.update(users).set({ totpEnabled: true }).where(eq(users.id, session.id));
  return NextResponse.json({ ok: true });
}
