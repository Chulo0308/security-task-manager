import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { taskTemplates } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getSession, isAdmin } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.select().from(taskTemplates).orderBy(desc(taskTemplates.createdAt));
  return NextResponse.json({ templates: rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const name = String(body.name || "").trim();
  const title = String(body.title || "").trim();
  if (!name || !title) return NextResponse.json({ error: "Name and title required" }, { status: 400 });

  const [row] = await db
    .insert(taskTemplates)
    .values({
      name,
      title,
      description: body.description || "",
      priority: body.priority || "medium",
      category: body.category || "general",
      location: body.location || null,
      createdBy: session.id,
    })
    .returning();
  return NextResponse.json({ template: row }, { status: 201 });
}
