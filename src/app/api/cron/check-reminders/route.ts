import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reminders, tasks, taskAssignees } from "@/db/schema";
import { and, isNull, lte, eq } from "drizzle-orm";
import { sendPushToUsers } from "@/lib/push";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  let remindersSent = 0;
  let overdueSent = 0;

  // 1. Due reminders that haven't been notified yet
  const dueReminders = await db
    .select()
    .from(reminders)
    .where(and(lte(reminders.remindAt, now), isNull(reminders.notifiedAt)));

  for (const r of dueReminders) {
    await sendPushToUsers([r.createdBy], {
      title: "Reminder",
      body: r.message || r.resourceTitle,
      url: r.resourceType === "task" ? "/dashboard/tasks" : "/dashboard/announcements",
      tag: `reminder-${r.id}`,
    }).catch(() => {});
    await db.update(reminders).set({ notifiedAt: now }).where(eq(reminders.id, r.id));
    remindersSent++;
  }

  // 2. Overdue tasks that haven't been notified yet
  const overdueTasks = await db
    .select()
    .from(tasks)
    .where(
      and(
        lte(tasks.dueAt, now),
        eq(tasks.status, "open"),
        isNull(tasks.overdueNotifiedAt)
      )
    );

  for (const t of overdueTasks) {
    const assigneeRows = await db
      .select({ userId: taskAssignees.userId })
      .from(taskAssignees)
      .where(eq(taskAssignees.taskId, t.id));
    const userIds = assigneeRows.map((a) => a.userId);
    if (t.assignedTo && !userIds.includes(t.assignedTo)) userIds.push(t.assignedTo);

    if (userIds.length) {
      await sendPushToUsers(userIds, {
        title: "Task overdue",
        body: t.title,
        url: "/dashboard/tasks",
        tag: `overdue-${t.id}`,
      }).catch(() => {});
    }
    await db.update(tasks).set({ overdueNotifiedAt: now }).where(eq(tasks.id, t.id));
    overdueSent++;
  }

  return NextResponse.json({ ok: true, remindersSent, overdueSent });
}
