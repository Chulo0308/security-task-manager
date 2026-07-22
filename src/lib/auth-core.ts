// Edge-compatible session helpers (no Node crypto, no bcrypt)
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-me-8bishopsgate-2026"
);
const COOKIE_NAME = "bsg_session";
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days

export type UserRole = "admin" | "supervisor" | "operator" | "guard";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  site: string;
};

export async function signSession(user: Omit<SessionUser, "site" | "title">) {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL}s`)
    .sign(SECRET);
}

// Decode JWT without DB lookup (fast, edge-compatible)
export async function decodeSession(token: string): Promise<Omit<SessionUser, "site" | "title"> | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      id: payload.sub as string,
      email: payload.email as string,
      role: payload.role as UserRole,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(user: Omit<SessionUser, "site" | "title">) {
  const token = await signSession(user);
  const cookieStore = await cookies();
  cookieStore.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set({
    name: COOKIE_NAME,
    value: "",
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

export function isAdmin(user: SessionUser | null) {
  return user?.role === "admin";
}

export function isSupervisorOrAbove(user: SessionUser | null) {
  return user?.role === "admin" || user?.role === "supervisor";
}
