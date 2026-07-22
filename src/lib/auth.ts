// Node-compatible auth helpers (includes bcrypt + DB)
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
  decodeSession,
  setSessionCookie,
  clearSessionCookie,
  isAdmin,
  isSupervisorOrAbove,
  type SessionUser,
  type UserRole,
} from "./auth-core";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await import("next/headers").then((m) => m.cookies());
  const token = cookieStore.get("bsg_session")?.value;
  if (!token) return null;
  const base = await decodeSession(token);
  if (!base) return null;

  try {
    const [row] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        title: users.title,
        site: users.site,
        active: users.active,
        lastSeenAt: users.lastSeenAt,
      })
      .from(users)
      .where(eq(users.id, base.id))
      .limit(1);
    if (!row || !row.active) return null;

    // Presence heartbeat (throttled to once per minute)
    const stale =
      !row.lastSeenAt || Date.now() - new Date(row.lastSeenAt).getTime() > 60_000;
    if (stale) {
      db.update(users)
        .set({ lastSeenAt: new Date() })
        .where(eq(users.id, row.id))
        .then(() => undefined)
        .catch(() => undefined);
    }

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role as UserRole,
      title: row.title,
      site: row.site,
    };
  } catch {
    // If DB not reachable, fall back to token payload (for middleware)
    return {
      id: base.id,
      name: base.name,
      email: base.email,
      role: base.role,
      title: "",
      site: "8 Bishopsgate",
    };
  }
}

export { setSessionCookie, clearSessionCookie, isAdmin, isSupervisorOrAbove };
export type { SessionUser, UserRole };
