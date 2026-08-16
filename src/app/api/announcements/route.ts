import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { announcements, announcementSeen, attachments, reminders, users } from "@/db/schema";
import { eq, desc, asc, and, or, ilike, inArray } from "drizzle-orm";
import { getSession, isSupervisorOrAbove } from "@/lib/auth";
import { sendPushToUsers } from "@/lib/push";
import { logActivity } from "@/lib/activity";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const priority = sp.get("priority");
  const search = sp.get("search");

  const conditions: any[] = [];
  if (priority) {
    const ps = priority.split(",").filter(Boolean);
    if (ps.length) {
      conditions.push(or(...ps.map((p) => eq(announcements.priority, p))));
    }
  }
  if (search) {
    conditions.push(
      or(
        ilike(announcements.title, `%${search}%`),
        ilike(announcements.body, `%${search}%`)
      )
    );
  }

  const rows = await db
    .select({
      id: announcements.id,
      title: announcements.title,
      body: announcements.body,
      priority: announcements.priority,
      pinned: announcements.pinned,
      authorId: announcements.authorId,
      createdAt: announcements.createdAt,
      updatedAt: announcements.updatedAt,
      expiresAt: announcements.expiresAt,
      authorName: users.name,
      authorTitle: users.title,
    })
    .from(announcements)
    .leftJoin(users, eq(announcements.authorId, users.id))
    .where(conditions.length ? and(...conditions.filter(Boolean)) : undefined)
    .orderBy(desc(announcements.pinned), desc(announcements.createdAt));

  const receiptRows = rows.length
    ? await db
        .select({
          announcementId: announcementSeen.announcementId,
          userId: announcementSeen.userId,
          name: users.name,
          title: users.title,
          role: users.role,
          seenAt: announcementSeen.seenAt,
        })
        .from(announcementSeen)
        .innerJoin(users, eq(announcementSeen.userId, users.id))
        .where(
          inArray(
            announcementSeen.announcementId,
            rows.map((row) => row.id)
          )
        )
        .orderBy(desc(announcementSeen.seenAt))
    : [];

  const receiptsByAnnouncement = new Map<string, typeof receiptRows>();
  for (const receipt of receiptRows) {
    const current = receiptsByAnnouncement.get(receipt.announcementId) ?? [];
    current.push(receipt);
    receiptsByAnnouncement.set(receipt.announcementId, current);
  }

  const annIds = rows.map((row) => row.id);
  const attachmentRows = annIds.length
    ? await db
        .select({
          id: attachments.id,
          resourceId: attachments.resourceId,
          fileName: attachments.fileName,
          mimeType: attachments.mimeType,
          size: attachments.size,
        })
        .from(attachments)
        .where(and(eq(attachments.resourceType, "announcement"), inArray(attachments.resourceId, annIds)))
        .orderBy(asc(attachments.createdAt))
    : [];

  const remindersRows = annIds.length
    ? await db
        .select()
        .from(reminders)
        .where(and(eq(reminders.resourceType, "announcement"), inArray(reminders.resourceId, annIds)))
        .orderBy(asc(reminders.remindAt))
    : [];

  const attachmentsByAnn = new Map<string, typeof attachmentRows>();
  for (const a of attachmentRows) {
    const cur = attachmentsByAnn.get(a.resourceId) ?? [];
    cur.push(a);
    attachmentsByAnn.set(a.resourceId, cur);
  }
  const remindersByAnn = new Map<string, typeof remindersRows>();
  for (const r of remindersRows) {
    const cur = remindersByAnn.get(r.resourceId) ?? [];
    cur.push(r);
    remindersByAnn.set(r.resourceId, cur);
  }

  return NextResponse.json({
    announcements: rows.map((announcement) => {
      const seenBy = receiptsByAnnouncement.get(announcement.id) ?? [];
      return {
        ...announcement,
        seenBy,
        seenCount: seenBy.length,
        seenByCurrentUser: seenBy.some(
          (receipt) => receipt.userId === session.id
        ),
        attachments: attachmentsByAnn.get(announcement.id) ?? [],
        reminders: remindersByAnn.get(announcement.id) ?? [],
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupervisorOrAbove(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const title = String(body.title || "").trim();
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const [row] = await db
    .insert(announcements)
    .values({
      title,
      body: body.body || "",
      priority: body.priority || "normal",
      pinned: Boolean(body.pinned),
      authorId: session.id,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    })
    .returning();

  const allUsers = await db.select({ id: users.id }).from(users);
  const recipients = allUsers.map((u) => u.id).filter((id) => id !== session.id);
  if (recipients.length) {
    sendPushToUsers(recipients, {
      title: "New announcement",
      body: title,
      url: "/dashboard/announcements",
      tag: `announcement-${row.id}`,
    }).catch(() => {});
  }

  logActivity({
    actorId: session.id,
    action: "created",
    resourceType: "announcement",
    resourceId: row.id,
    resourceTitle: row.title,
  }).catch(() => {});

  return NextResponse.json({ announcement: row }, { status: 201 });
}
