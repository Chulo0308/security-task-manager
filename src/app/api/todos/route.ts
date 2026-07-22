import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { todos } from "@/db/schema";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(todos)
    .where(eq(todos.userId, session.id))
    .orderBy(asc(todos.done), asc(todos.dueAt), asc(todos.createdAt));

  return NextResponse.json({ todos: rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const title = String(body.title || "").trim();
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const [row] = await db
    .insert(todos)
    .values({
      userId: session.id,
      title,
      dueAt: body.dueAt ? new Date(body.dueAt) : null,
    })
    .returning();

  return NextResponse.json({ todo: row }, { status: 201 });
}
