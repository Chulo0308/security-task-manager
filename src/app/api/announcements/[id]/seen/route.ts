import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { announcements, announcementSeen, users } from "@/db/schema";
import { getSession } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [announcement] = await db
    .select({ id: announcements.id })
    .from(announcements)
    .where(eq(announcements.id, id))
    .limit(1);

  if (!announcement) {
    return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
  }

  await db
    .insert(announcementSeen)
    .values({ announcementId: id, userId: session.id })
    .onConflictDoNothing();

  const [receipt] = await db
    .select({
      userId: announcementSeen.userId,
      name: users.name,
      title: users.title,
      role: users.role,
      seenAt: announcementSeen.seenAt,
    })
    .from(announcementSeen)
    .innerJoin(users, eq(announcementSeen.userId, users.id))
    .where(
      and(
        eq(announcementSeen.announcementId, id),
        eq(announcementSeen.userId, session.id)
      )
    )
    .limit(1);

  return NextResponse.json({ seen: true, receipt });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await db
    .delete(announcementSeen)
    .where(
      and(
        eq(announcementSeen.announcementId, id),
        eq(announcementSeen.userId, session.id)
      )
    );

  return NextResponse.json({ seen: false });
}
