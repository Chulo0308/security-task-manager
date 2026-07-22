import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

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

  const body = await req.json();

  // Build partial update
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
  return NextResponse.json({ task: row });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  await db.delete(tasks).where(eq(tasks.id, id));
  return NextResponse.json({ ok: true });
}
