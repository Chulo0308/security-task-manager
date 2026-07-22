import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { reminders } from "@/db/schema";
import { getSession, isSupervisorOrAbove } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const resourceType = sp.get("resourceType");
  const resourceId = sp.get("resourceId");

  const conditions: any[] = [];
  if (resourceType) conditions.push(eq(reminders.resourceType, resourceType));
  if (resourceId) conditions.push(eq(reminders.resourceId, resourceId));

  const rows = await db
    .select()
    .from(reminders)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(reminders.remindAt));

  return NextResponse.json({ reminders: rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupervisorOrAbove(session)) {
    return NextResponse.json({ error: "Only administrators and supervisors can add reminders" }, { status: 403 });
  }

  const body = await req.json();
  const resourceType = String(body.resourceType || "");
  const resourceId = String(body.resourceId || "");
  const resourceTitle = String(body.resourceTitle || "").trim();
  const remindAt = body.remindAt ? new Date(body.remindAt) : null;
  if (!resourceId || !remindAt || (resourceType !== "task" && resourceType !== "announcement")) {
    return NextResponse.json({ error: "resourceType (task|announcement), resourceId and remindAt required" }, { status: 400 });
  }

  const [row] = await db
    .insert(reminders)
    .values({
      resourceType,
      resourceId,
      resourceTitle: resourceTitle || "(untitled)",
      message: body.message || "",
      remindAt,
      createdBy: session.id,
    })
    .returning();

  return NextResponse.json({ reminder: row }, { status: 201 });
}
