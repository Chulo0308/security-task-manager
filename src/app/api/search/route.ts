import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, announcements, users, taskAssignees } from "@/db/schema";
import { and, or, ilike, eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ tasks: [], announcements: [], users: [] });

  const like = `%${q}%`;

  // Tasks — same visibility rule as the main tasks list: admins see all,
  // everyone else sees only tasks they created or are assigned to.
  const taskConditions: any[] = [
    or(ilike(tasks.title, like), ilike(tasks.description, like), ilike(tasks.location, like)),
  ];
  if (session.role !== "admin") {
    taskConditions.push(
      or(
        eq(tasks.createdBy, session.id),
        eq(tasks.assignedTo, session.id),
        sql`exists (select 1 from ${taskAssignees} where ${taskAssignees.taskId} = ${tasks.id} and ${taskAssignees.userId} = ${session.id})`
      )
    );
  }
  const taskRows = await db
    .select({ id: tasks.id, title: tasks.title, status: tasks.status, priority: tasks.priority })
    .from(tasks)
    .where(and(...taskConditions))
    .limit(8);

  // Announcements — visible to everyone, same as the announcements page.
  const annRows = await db
    .select({ id: announcements.id, title: announcements.title, priority: announcements.priority })
    .from(announcements)
    .where(or(ilike(announcements.title, like), ilike(announcements.body, like)))
    .limit(8);

  // Team — name/title only, no contact details (matches directory visibility elsewhere).
  const userRows = await db
    .select({ id: users.id, name: users.name, title: users.title, role: users.role })
    .from(users)
    .where(or(ilike(users.name, like), ilike(users.title, like)))
    .limit(8);

  return NextResponse.json({ tasks: taskRows, announcements: annRows, users: userRows });
}
