import { db } from "@/db";
import { sessions } from "@/db/schema";
import type { NextRequest } from "next/server";

export async function createSession(userId: string, req: NextRequest): Promise<string> {
  const userAgent = req.headers.get("user-agent") || "Unknown device";
  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const [row] = await db.insert(sessions).values({ userId, userAgent, ipAddress }).returning();
  return row.id;
}
