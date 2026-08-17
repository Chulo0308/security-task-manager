import { NextRequest, NextResponse } from "next/server";
import { eq, count } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { DEMO_USERS } from "@/lib/seed";
import { createSession } from "@/lib/sessions";

const DEMO_EMAILS = new Set(DEMO_USERS.map((u) => u.email.toLowerCase()));

export async function GET() {
  const all = await db.select({ email: users.email, role: users.role }).from(users);
  const hasAdmin = all.some((u) => u.role === "admin");
  const demoPresent = all.some((u) => DEMO_EMAILS.has(u.email.toLowerCase()));
  const livePresent = all.some((u) => !DEMO_EMAILS.has(u.email.toLowerCase()));

  return NextResponse.json({
    userCount: all.length,
    hasAdmin,
    demoPresent,
    livePresent,
    demoAccounts: demoPresent
      ? DEMO_USERS.map((u) => ({ name: u.name, email: u.email, password: u.password, role: u.role, title: u.title }))
      : [],
  });
}

// Create the first real administrator account.
// Only permitted while no administrator exists — after that, account
// management happens in the Team page by an authenticated admin.
export async function POST(req: NextRequest) {
  const all = await db.select({ role: users.role }).from(users);
  if (all.some((u) => u.role === "admin")) {
    return NextResponse.json(
      { error: "An administrator already exists. Sign in and manage accounts from the Team page." },
      { status: 409 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email and password are required" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  try {
    const [row] = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash: await hashPassword(password),
        role: "admin",
        title: "Security Operations Manager",
        site: "8 Bishopsgate",
        active: true,
      })
      .returning();

    const sessionUser = {
      id: row.id,
      name: row.name,
      email: row.email,
      role: "admin" as const,
      title: row.title,
      site: row.site,
    };
    const sid = await createSession(row.id, req);
    await setSessionCookie(sessionUser, sid);

    return NextResponse.json({ user: sessionUser }, { status: 201 });
  } catch (e: any) {
    if (String(e?.message || "").includes("users_email_key")) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
