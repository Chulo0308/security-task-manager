import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { taskTemplates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession, isAdmin } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await db.delete(taskTemplates).where(eq(taskTemplates.id, id));
  return NextResponse.json({ ok: true });
}
