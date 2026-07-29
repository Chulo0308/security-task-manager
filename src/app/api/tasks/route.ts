import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attachments, reminders, tasks, taskSeen, taskAssignees, users } from "@/db/schema";
import { eq, desc, asc, and, inArray, or, sql, ilike } from "drizzle-orm";
import { getSession, isSupervisorOrAbove } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const priority = sp.get("priority");
  const category = sp.get("category");
  const assignedTo = sp.get("assignedTo");
  const search = sp.get("search");
  const mine = sp.get("mine") === "true";
  const overdue = sp.get("overdue") === "true";

  const conditions: any[] = [];

  if (status) {
    const statuses = status.split(",").filter(Boolean);
    if (statuses.length) conditions.push(inArray(tasks.status, statuses));
  }
  if (priority) {
    const ps = priority.split(",").filter(Boolean);
    if (ps.length) conditions.push(inArray(tasks.priority, ps));
  }
  if (category) {
    const cs = category.split(",").filter(Boolean);
    if (cs.length) conditions.push(inArray(tasks.category, cs));
  }
  if (assignedTo) conditions.push(eq(tasks.assignedTo, assignedTo));
  if (mine) conditions.push(eq(tasks.assignedTo, session.id));
  if (search) {
    conditions.push(
      or(
        ilike(tasks.title, `%${search}%`),
        ilike(tasks.description, `%${search}%`),
        ilike(tasks.location, `%${search}%`)
      )
    );
  }
  if (overdue) {
    conditions.push(sql`${tasks.dueAt} < ${new Date()}`);
    conditions.push(eq(tasks.status, "open"));
  }
  // Visibility: admins see everything; everyone else sees only tasks they
  // created or are assigned to (via legacy assignedTo OR the assignees table).
  if (session.role !== "admin") {
    conditions.push(
      or(
        eq(tasks.createdBy, session.id),
        eq(tasks.assignedTo, session.id),
        sql`exists (select 1 from ${taskAssignees} where ${taskAssignees.taskId} = ${tasks.id} and ${taskAssignees.userId} = ${session.id})`
      )
    );
  }

  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      priority: tasks.priority,
      status: tasks.status,
      category: tasks.category,
      location: tasks.location,
      dueAt: tasks.dueAt,
      completedAt: tasks.completedAt,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      assignedTo: tasks.assignedTo,
      createdBy: tasks.createdBy,
      assigneeName: users.name,
      assigneeTitle: users.title,
      creatorName: sql<string>`(select ${users.name} from ${users} where ${users.id} = ${tasks.createdBy})`.as("creator_name"),
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assignedTo, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(tasks.createdAt));

  const receiptRows = rows.length
    ? await db
        .select({
          taskId: taskSeen.taskId,
          userId: taskSeen.userId,
          name: users.name,
          title: users.title,
          role: users.role,
          seenAt: taskSeen.seenAt,
        })
        .from(taskSeen)
        .innerJoin(users, eq(taskSeen.userId, users.id))
        .where(inArray(taskSeen.taskId, rows.map((row) => row.id)))
        .orderBy(desc(taskSeen.seenAt))
    : [];

  const receiptsByTask = new Map<string, typeof receiptRows>();
  for (const receipt of receiptRows) {
    const current = receiptsByTask.get(receipt.taskId) ?? [];
    current.push(receipt);
    receiptsByTask.set(receipt.taskId, current);
  }

  const taskIds = rows.map((row) => row.id);
  const attachmentRows = taskIds.length
    ? await db
        .select({
          id: attachments.id,
          resourceId: attachments.resourceId,
          fileName: attachments.fileName,
          mimeType: attachments.mimeType,
          size: attachments.size,
        })
        .from(attachments)
        .where(and(eq(attachments.resourceType, "task"), inArray(attachments.resourceId, taskIds)))
        .orderBy(asc(attachments.createdAt))
    : [];

  const remindersRows = taskIds.length
    ? await db
        .select()
        .from(reminders)
        .where(and(eq(reminders.resourceType, "task"), inArray(reminders.resourceId, taskIds)))
        .orderBy(asc(reminders.remindAt))
    : [];

  const attachmentsByTask = new Map<string, typeof attachmentRows>();
  for (const a of attachmentRows) {
    const cur = attachmentsByTask.get(a.resourceId) ?? [];
    cur.push(a);
    attachmentsByTask.set(a.resourceId, cur);
  }
  const remindersByTask = new Map<string, typeof remindersRows>();
  for (const r of remindersRows) {
    const cur = remindersByTask.get(r.resourceId) ?? [];
    cur.push(r);
    remindersByTask.set(r.resourceId, cur);
  }

  return NextResponse.json({
    tasks: rows.map((task) => {
      const seenBy = receiptsByTask.get(task.id) ?? [];
      return {
        ...task,
        seenBy,
        seenCount: seenBy.length,
        seenByCurrentUser: seenBy.some((receipt) => receipt.userId === session.id),
        attachments: attachmentsByTask.get(task.id) ?? [],
        reminders: remindersByTask.get(task.id) ?? [],
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupervisorOrAbove(session)) {
    return NextResponse.json({ error: "Only supervisors and admins can create tasks" }, { status: 403 });
  }

  const body = await req.json();
  const title = String(body.title || "").trim();
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const [row] = await db
    .insert(tasks)
    .values({
      title,
      description: body.description || "",
      priority: body.priority || "medium",
      status: body.status || "open",
      category: body.category || "general",
      location: body.location || null,
      assignedTo: body.assignedTo || null,
      createdBy: session.id,
      dueAt: body.dueAt ? new Date(body.dueAt) : null,
    })
    .returning();

  return NextResponse.json({ task: row }, { status: 201 });
}
