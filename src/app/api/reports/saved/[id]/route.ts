import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { savedReports } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession, isSupervisorOrAbove } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupervisorOrAbove(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await db.delete(savedReports).where(eq(savedReports.id, id));
  return NextResponse.json({ ok: true });
}
