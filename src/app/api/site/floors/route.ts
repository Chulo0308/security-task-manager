import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { floors } from "@/db/schema";
import { getSession, isAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const [row] = await db
    .insert(floors)
    .values({
      name,
      level: Number(body.level ?? 0),
      notes: body.notes || null,
      sortOrder: Number(body.level ?? 0),
    })
    .returning();

  return NextResponse.json({ floor: row }, { status: 201 });
}
