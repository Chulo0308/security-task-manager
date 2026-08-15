import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { and, gte, lte, eq, sql } from "drizzle-orm";
import { getSession, isSupervisorOrAbove } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupervisorOrAbove(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const from = sp.get("from");
  const to = sp.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "from and to dates required" }, { status: 400 });
  }
  const fromDate = new Date(from);
  const toDate = new Date(to);

  const rangeFilter = and(gte(tasks.createdAt, fromDate), lte(tasks.createdAt, toDate));

  const allTasks = await db.select().from(tasks).where(rangeFilter);

  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  let overdueCount = 0;
  const now = new Date();

  for (const t of allTasks) {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
    byCategory[t.category] = (byCategory[t.category] || 0) + 1;
    if (t.dueAt && t.status === "open" && t.dueAt < now) overdueCount++;
  }

  const completed = byStatus["completed"] || 0;
  const total = allTasks.length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return NextResponse.json({
    range: { from, to },
    totalTasks: total,
    byStatus,
    byPriority,
    byCategory,
    overdueCount,
    completionRate,
  });
}
