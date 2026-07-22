import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { reminders } from "@/db/schema";
import { getSession, isSupervisorOrAbove } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupervisorOrAbove(session)) {
    return NextResponse.json({ error: "Only administrators and supervisors can remove reminders" }, { status: 403 });
  }
  const { id } = await params;
  await db.delete(reminders).where(eq(reminders.id, id));
  return NextResponse.json({ ok: true });
}
