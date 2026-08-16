import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession, verifyPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const password = String(body.password || "");

  const [user] = await db.select().from(users).where(eq(users.id, session.id)).limit(1);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Incorrect password" }, { status: 401 });

  await db.update(users).set({ totpSecret: null, totpEnabled: false }).where(eq(users.id, session.id));
  return NextResponse.json({ ok: true });
}
