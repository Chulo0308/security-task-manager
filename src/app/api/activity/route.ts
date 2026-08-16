import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { activityLog, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession, isAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const limit = Math.min(Number(sp.get("limit")) || 100, 500);

  const rows = await db
    .select({
      id: activityLog.id,
      action: activityLog.action,
      resourceType: activityLog.resourceType,
      resourceId: activityLog.resourceId,
      resourceTitle: activityLog.resourceTitle,
      details: activityLog.details,
      createdAt: activityLog.createdAt,
      actorName: users.name,
      actorTitle: users.title,
    })
    .from(activityLog)
    .leftJoin(users, eq(activityLog.actorId, users.id))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);

  return NextResponse.json({ entries: rows });
}
