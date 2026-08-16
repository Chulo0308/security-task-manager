import { db } from "@/db";
import { activityLog } from "@/db/schema";

type LogParams = {
  actorId: string;
  action: string; // e.g. "created", "completed", "deleted", "assigned"
  resourceType: string; // e.g. "task", "announcement", "user", "floor", "site"
  resourceId?: string;
  resourceTitle?: string;
  details?: string;
};

// Fire-and-forget activity logging. Never throws — a logging failure
// must never break the actual operation it's recording.
export async function logActivity(params: LogParams) {
  try {
    await db.insert(activityLog).values({
      actorId: params.actorId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId || null,
      resourceTitle: params.resourceTitle || null,
      details: params.details || null,
    });
  } catch (e) {
    console.error("Activity log failed:", e);
  }
}
