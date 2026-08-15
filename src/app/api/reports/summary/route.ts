import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, taskAssignees, users } from "@/db/schema";
import { and, gte, lte, inArray } from "drizzle-orm";
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

  // --- Officer activity ---
  const taskIds = allTasks.map((t) => t.id);
  const allUsers = await db.select({ id: users.id, name: users.name, title: users.title }).from(users);

  const assignments = taskIds.length
    ? await db.select().from(taskAssignees).where(inArray(taskAssignees.taskId, taskIds))
    : [];

  const taskById = new Map(allTasks.map((t) => [t.id, t]));

  type OfficerStat = {
    userId: string;
    name: string;
    title: string;
    assigned: number;
    completed: number;
    responseTimes: number[];
  };
  const officerStats = new Map<string, OfficerStat>();

  for (const a of assignments) {
    const t = taskById.get(a.taskId);
    if (!t) continue;
    const user = allUsers.find((u) => u.id === a.userId);
    if (!user) continue;

    let stat = officerStats.get(a.userId);
    if (!stat) {
      stat = { userId: a.userId, name: user.name, title: user.title, assigned: 0, completed: 0, responseTimes: [] };
      officerStats.set(a.userId, stat);
    }
    stat.assigned++;
    if (t.status === "completed") {
      stat.completed++;
      if (t.completedAt && t.dueAt) {
        const diffDays = (t.completedAt.getTime() - t.dueAt.getTime()) / (1000 * 60 * 60 * 24);
        stat.responseTimes.push(diffDays);
      }
    }
  }

  const officerActivity = Array.from(officerStats.values())
    .map((s) => ({
      userId: s.userId,
      name: s.name,
      title: s.title,
      assigned: s.assigned,
      completed: s.completed,
      avgResponseDays:
        s.responseTimes.length > 0
          ? Math.round((s.responseTimes.reduce((a, b) => a + b, 0) / s.responseTimes.length) * 10) / 10
          : null,
    }))
    .sort((a, b) => b.completed - a.completed);

  return NextResponse.json({
    range: { from, to },
    totalTasks: total,
    byStatus,
    byPriority,
    byCategory,
    overdueCount,
    completionRate,
    officerActivity,
  });
}
