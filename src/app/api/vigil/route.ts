import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, announcements, taskAssignees } from "@/db/schema";
import { and, or, eq, sql, gte } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { askAssistant } from "@/lib/assistant";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const message = String(body.message || "").trim();
  if (!message) return NextResponse.json({ error: "Message required" }, { status: 400 });

  // Gather a scoped snapshot of live data the user is allowed to see.
  const taskConditions: any[] = [];
  if (session.role !== "admin") {
    taskConditions.push(
      or(
        eq(tasks.createdBy, session.id),
        eq(tasks.assignedTo, session.id),
        sql`exists (select 1 from ${taskAssignees} where ${taskAssignees.taskId} = ${tasks.id} and ${taskAssignees.userId} = ${session.id})`
      )
    );
  }

  const myTasks = await db
    .select({
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      dueAt: tasks.dueAt,
    })
    .from(tasks)
    .where(taskConditions.length ? and(...taskConditions) : undefined)
    .limit(50);

  const now = new Date();
  const openCount = myTasks.filter((t) => t.status === "open" || t.status === "in_progress").length;
  const overdueCount = myTasks.filter(
    (t) => t.dueAt && new Date(t.dueAt) < now && t.status !== "completed" && t.status !== "cancelled"
  ).length;
  const overdueList = myTasks
    .filter((t) => t.dueAt && new Date(t.dueAt) < now && t.status !== "completed" && t.status !== "cancelled")
    .map((t) => `- "${t.title}" (${t.priority}, was due ${new Date(t.dueAt!).toDateString()})`)
    .join("\n");

  const recentAnnouncements = await db
    .select({ title: announcements.title, priority: announcements.priority, createdAt: announcements.createdAt })
    .from(announcements)
    .orderBy(sql`${announcements.createdAt} desc`)
    .limit(5);
  const announcementsList = recentAnnouncements
    .map((a) => `- "${a.title}" (${a.priority})`)
    .join("\n");

  const systemPrompt = `You are Vigil, the helpful in-app assistant for 8 Bishopsgate Security Operations, a task management and communications platform for a building security team.

You are talking to ${session.name}, a ${session.role}.

You can help with two kinds of things:
1. Questions about the app itself — how to create tasks, add announcements, use reports, enable two-factor authentication, install the app, etc.
2. Questions about their current work, using this live snapshot of data relevant to them:

Open/in-progress tasks: ${openCount}
Overdue tasks: ${overdueCount}
${overdueList ? "Overdue task details:\n" + overdueList : ""}

Recent announcements:
${announcementsList || "(none)"}

Keep answers short, plain, and practical — this is a busy operational context, not a place for long essays. If asked something outside your knowledge (e.g. about a specific task not listed above), say you don't have that detail rather than guessing. Never invent task names, dates, or data that wasn't given to you above.`;

  const reply = await askAssistant(systemPrompt, message);
  return NextResponse.json({ reply });
}
