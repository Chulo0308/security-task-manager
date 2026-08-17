import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession, isAdmin } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const [existing] = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  if (!existing) return NextResponse.json({ ok: true });

  // Users can revoke their own sessions; admins can revoke anyone's.
  if (existing.userId !== session.id && !isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.delete(sessions).where(eq(sessions.id, id));
  return NextResponse.json({ ok: true });
}
