import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { floors } from "@/db/schema";
import { getSession, isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const update: Record<string, any> = {};
  if (body.name !== undefined) update.name = String(body.name).trim();
  if (body.level !== undefined) { update.level = Number(body.level); update.sortOrder = Number(body.level); }
  if (body.notes !== undefined) update.notes = body.notes || null;
  const [row] = await db.update(floors).set(update).where(eq(floors.id, id)).returning();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  logActivity({
    actorId: session.id,
    action: "updated",
    resourceType: "floor",
    resourceId: row.id,
    resourceTitle: row.name,
  }).catch(() => {});

  return NextResponse.json({ floor: row });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const [existing] = await db.select().from(floors).where(eq(floors.id, id)).limit(1);

  await db.delete(floors).where(eq(floors.id, id));

  if (existing) {
    logActivity({
      actorId: session.id,
      action: "deleted",
      resourceType: "floor",
      resourceId: existing.id,
      resourceTitle: existing.name,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
