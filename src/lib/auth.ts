// Node-compatible auth helpers (includes bcrypt + DB)
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
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

    // If this token carries a session id, confirm that session hasn't
    // been revoked. Tokens without a sid (issued before this feature)
    // are treated as valid for backward compatibility.
    if (base.sid) {
      const [sessionRow] = await db
        .select({ id: sessions.id, lastActiveAt: sessions.lastActiveAt })
        .from(sessions)
        .where(eq(sessions.id, base.sid))
        .limit(1);
      if (!sessionRow) return null;

      const staleSession =
        Date.now() - new Date(sessionRow.lastActiveAt).getTime() > 60_000;
      if (staleSession) {
        db.update(sessions)
          .set({ lastActiveAt: new Date() })
          .where(eq(sessions.id, base.sid))
          .then(() => undefined)
          .catch(() => undefined);
      }
    }

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
      sid: base.sid,
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
      sid: base.sid,
    };
  }
}

export { setSessionCookie, clearSessionCookie, isAdmin, isSupervisorOrAbove };
export type { SessionUser, UserRole };
