import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { savedReports, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession, isSupervisorOrAbove } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupervisorOrAbove(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await db
    .select({
      id: savedReports.id,
      name: savedReports.name,
      fromDate: savedReports.fromDate,
      toDate: savedReports.toDate,
      createdAt: savedReports.createdAt,
      createdByName: users.name,
    })
    .from(savedReports)
    .leftJoin(users, eq(savedReports.createdBy, users.id))
    .orderBy(desc(savedReports.createdAt));

  return NextResponse.json({ reports: rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupervisorOrAbove(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const name = String(body.name || "").trim();
  const fromDate = String(body.fromDate || "");
  const toDate = String(body.toDate || "");
  if (!name || !fromDate || !toDate) {
    return NextResponse.json({ error: "Name, fromDate and toDate required" }, { status: 400 });
  }

  const [row] = await db
    .insert(savedReports)
    .values({ name, fromDate, toDate, createdBy: session.id })
    .returning();

  return NextResponse.json({ report: row }, { status: 201 });
}
