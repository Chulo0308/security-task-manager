import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { tasks, taskSeen, users } from "@/db/schema";
import { getSession } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [task] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.id, id))
    .limit(1);

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await db
    .insert(taskSeen)
    .values({ taskId: id, userId: session.id })
    .onConflictDoNothing();

  const [receipt] = await db
    .select({
      userId: taskSeen.userId,
      name: users.name,
      title: users.title,
      role: users.role,
      seenAt: taskSeen.seenAt,
    })
    .from(taskSeen)
    .innerJoin(users, eq(taskSeen.userId, users.id))
    .where(and(eq(taskSeen.taskId, id), eq(taskSeen.userId, session.id)))
    .limit(1);

  return NextResponse.json({ seen: true, receipt });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await db
    .delete(taskSeen)
    .where(and(eq(taskSeen.taskId, id), eq(taskSeen.userId, session.id)));

  return NextResponse.json({ seen: false });
}
