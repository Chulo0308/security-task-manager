import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession, isAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requestedUserId = req.nextUrl.searchParams.get("userId");
  let targetUserId = session.id;

  if (requestedUserId && requestedUserId !== session.id) {
    if (!isAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    targetUserId = requestedUserId;
  }

  const rows = await db
    .select({
      id: sessions.id,
      userAgent: sessions.userAgent,
      ipAddress: sessions.ipAddress,
      createdAt: sessions.createdAt,
      lastActiveAt: sessions.lastActiveAt,
    })
    .from(sessions)
    .where(eq(sessions.userId, targetUserId))
    .orderBy(desc(sessions.lastActiveAt));

  return NextResponse.json({ sessions: rows, currentSessionId: session.sid || null });
}
