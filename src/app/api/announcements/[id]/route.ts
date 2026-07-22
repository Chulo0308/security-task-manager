import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession, isSupervisorOrAbove } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupervisorOrAbove(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const update: Record<string, any> = { updatedAt: new Date() };
  if (body.title !== undefined) update.title = String(body.title || "").trim();
  if (body.body !== undefined) update.body = body.body;
  if (body.priority !== undefined) update.priority = body.priority;
  if (body.pinned !== undefined) update.pinned = Boolean(body.pinned);
  if (body.expiresAt !== undefined) update.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

  const [row] = await db
    .update(announcements)
    .set(update)
    .where(eq(announcements.id, id))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ announcement: row });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupervisorOrAbove(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  await db.delete(announcements).where(eq(announcements.id, id));
  return NextResponse.json({ ok: true });
}
