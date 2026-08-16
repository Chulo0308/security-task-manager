import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, users, taskAssignees } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession, isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

async function canModifyTask(sessionId: string, isSessionAdmin: boolean, task: { createdBy: string; assignedTo: string | null }, taskId: string) {
  if (isSessionAdmin) return true;
  if (task.createdBy === sessionId) return true;
  if (task.assignedTo === sessionId) return true;
  const [link] = await db
    .select()
    .from(taskAssignees)
    .where(and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, sessionId)))
    .limit(1);
  return !!link;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const [row] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, id))
    .limit(1);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  let assignee: { id: string; name: string; title: string } | null = null;
  if (row.assignedTo) {
    const [u] = await db.select({ id: users.id, name: users.name, title: users.title }).from(users).where(eq(users.id, row.assignedTo)).limit(1);
    if (u) assignee = u;
  }
  const [creator] = await db.select({ id: users.id, name: users.name, title: users.title }).from(users).where(eq(users.id, row.createdBy)).limit(1);
  return NextResponse.json({ task: row, assignee, creator });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const [existing] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed = await canModifyTask(session.id, isAdmin(session), existing, id);
  if (!allowed) {
    return NextResponse.json({ error: "Only the creator, an assignee, or an admin can update this task" }, { status: 403 });
  }

  const body = await req.json();
  const update: Record<string, any> = { updatedAt: new Date() };
  if (body.title !== undefined) update.title = String(body.title || "").trim();
  if (body.description !== undefined) update.description = body.description;
  if (body.priority !== undefined) update.priority = body.priority;
  if (body.status !== undefined) update.status = body.status;
  if (body.category !== undefined) update.category = body.category;
  if (body.location !== undefined) update.location = body.location || null;
  if (body.dueAt !== undefined) update.dueAt = body.dueAt ? new Date(body.dueAt) : null;
  if (body.assignedTo !== undefined) update.assignedTo = body.assignedTo || null;
  if (body.status === "completed") update.completedAt = new Date();
  if (body.status && body.status !== "completed") update.completedAt = null;

  const [row] = await db
    .update(tasks)
    .set(update)
    .where(eq(tasks.id, id))
    .returning();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const becameCompleted = body.status === "completed" && existing.status !== "completed";
  logActivity({
    actorId: session.id,
    action: becameCompleted ? "completed" : "updated",
    resourceType: "task",
    resourceId: row.id,
    resourceTitle: row.title,
  }).catch(() => {});

  return NextResponse.json({ task: row });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const [existing] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed = await canModifyTask(session.id, isAdmin(session), existing, id);
  if (!allowed) {
    return NextResponse.json({ error: "Only the creator, an assignee, or an admin can delete this task" }, { status: 403 });
  }

  await db.delete(tasks).where(eq(tasks.id, id));

  logActivity({
    actorId: session.id,
    action: "deleted",
    resourceType: "task",
    resourceId: existing.id,
    resourceTitle: existing.title,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
