import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { todos } from "@/db/schema";
import { getSession } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const update: Record<string, any> = { updatedAt: new Date() };
  if (body.title !== undefined) update.title = String(body.title).trim();
  if (body.done !== undefined) update.done = Boolean(body.done);
  if (body.dueAt !== undefined) update.dueAt = body.dueAt ? new Date(body.dueAt) : null;

  const [row] = await db
    .update(todos)
    .set(update)
    .where(and(eq(todos.id, id), eq(todos.userId, session.id)))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ todo: row });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await db.delete(todos).where(and(eq(todos.id, id), eq(todos.userId, session.id)));
  return NextResponse.json({ ok: true });
}
