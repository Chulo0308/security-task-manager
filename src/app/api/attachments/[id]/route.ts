import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { attachments } from "@/db/schema";
import { getSession, isSupervisorOrAbove } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

// Inline, view-only streaming. Downloads are intentionally NOT offered:
// no Content-Disposition: attachment header is ever sent.
export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const [row] = await db.select().from(attachments).where(eq(attachments.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Policy: only images are viewable inline. Documents are listed but
  // cannot be streamed or downloaded, per site security policy.
  if (!row.mimeType.startsWith("image/")) {
    return NextResponse.json(
      { error: "Documents are protected — viewing and downloading disabled by policy" },
      { status: 403 }
    );
  }

  const buffer = Buffer.from(row.data, "base64");
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": row.mimeType,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const [row] = await db.select().from(attachments).where(eq(attachments.id, id)).limit(1);
  if (!row) return NextResponse.json({ ok: true });
  if (!isSupervisorOrAbove(session) && row.uploadedBy !== session.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.delete(attachments).where(eq(attachments.id, id));
  return NextResponse.json({ ok: true });
}
