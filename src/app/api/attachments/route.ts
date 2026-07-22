import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { attachments } from "@/db/schema";
import { getSession, isSupervisorOrAbove } from "@/lib/auth";

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB
const ALLOWED = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf", "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const resourceType = sp.get("resourceType") || "";
  const resourceId = sp.get("resourceId") || "";
  if (!resourceType || !resourceId) {
    return NextResponse.json({ error: "resourceType and resourceId required" }, { status: 400 });
  }

  const rows = await db
    .select({
      id: attachments.id,
      resourceType: attachments.resourceType,
      resourceId: attachments.resourceId,
      fileName: attachments.fileName,
      mimeType: attachments.mimeType,
      size: attachments.size,
      uploadedBy: attachments.uploadedBy,
      createdAt: attachments.createdAt,
    })
    .from(attachments)
    .where(and(eq(attachments.resourceType, resourceType), eq(attachments.resourceId, resourceId)))
    .orderBy(asc(attachments.createdAt));

  return NextResponse.json({ attachments: rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const resourceType = String(form.get("resourceType") || "");
  const resourceId = String(form.get("resourceId") || "");
  const file = form.get("file") as File | null;

  if (!file || !resourceId || (resourceType !== "task" && resourceType !== "announcement")) {
    return NextResponse.json({ error: "file, resourceType (task|announcement) and resourceId required" }, { status: 400 });
  }
  if (resourceType === "announcement" && !isSupervisorOrAbove(session)) {
    return NextResponse.json({ error: "Only supervisors and administrators can attach files to announcements" }, { status: 403 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "File type not supported" }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds 4 MB limit" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const [row] = await db
    .insert(attachments)
    .values({
      resourceType,
      resourceId,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      data: buffer.toString("base64"),
      uploadedBy: session.id,
    })
    .returning({
      id: attachments.id,
      resourceType: attachments.resourceType,
      resourceId: attachments.resourceId,
      fileName: attachments.fileName,
      mimeType: attachments.mimeType,
      size: attachments.size,
      uploadedBy: attachments.uploadedBy,
      createdAt: attachments.createdAt,
    });

  return NextResponse.json({ attachment: row }, { status: 201 });
}
