import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [user] = await db.select({ totpEnabled: users.totpEnabled }).from(users).where(eq(users.id, session.id)).limit(1);
  return NextResponse.json({ enabled: user?.totpEnabled || false });
}
