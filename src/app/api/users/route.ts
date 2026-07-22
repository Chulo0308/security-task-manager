import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession, isAdmin, hashPassword } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      title: users.title,
      site: users.site,
      phone: users.phone,
      active: users.active,
      lastSeenAt: users.lastSeenAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  // Presence visibility rules:
  //  - administrators can see anyone's last-seen
  //  - supervisors can see officers/operators, but never managers (admin)
  //  - operators/guards see no presence data
  const now = Date.now();
  const ONLINE_WINDOW = 3 * 60 * 1000;
  const requesterIsAdmin = session.role === "admin";
  const requesterIsSupervisor = session.role === "supervisor";

  const mapped = rows.map((u) => {
    let lastSeenAt: string | null = null;
    if (requesterIsAdmin) lastSeenAt = u.lastSeenAt ? u.lastSeenAt.toISOString() : null;
    else if (requesterIsSupervisor && u.role !== "admin")
      lastSeenAt = u.lastSeenAt ? u.lastSeenAt.toISOString() : null;
    const online = lastSeenAt ? now - new Date(lastSeenAt).getTime() < ONLINE_WINDOW : false;
    const { lastSeenAt: _omit, ...rest } = u;
    void _omit;
    return { ...rest, lastSeenAt, online };
  });

  return NextResponse.json({ users: mapped });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email and password required" }, { status: 400 });
  }

  try {
    const [row] = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash: await hashPassword(password),
        role: body.role || "guard",
        title: body.title || "Security Officer",
        site: body.site || "8 Bishopsgate",
        phone: body.phone || null,
        active: body.active !== false,
      })
      .returning();
    const { passwordHash, ...safe } = row;
    return NextResponse.json({ user: safe }, { status: 201 });
  } catch (e: any) {
    if (String(e?.message || "").includes("users_email_key")) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Non-admins can only update themselves and only certain fields
  const isAdminUser = isAdmin(session);
  if (!isAdminUser && session.id !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const update: Record<string, any> = {};
  if (isAdminUser) {
    if (body.name !== undefined) update.name = String(body.name || "").trim();
    if (body.email !== undefined) update.email = String(body.email || "").trim().toLowerCase();
    if (body.role !== undefined) update.role = body.role;
    if (body.title !== undefined) update.title = body.title;
    if (body.phone !== undefined) update.phone = body.phone;
    if (body.active !== undefined) update.active = Boolean(body.active);
  }
  if (body.password) {
    update.passwordHash = await hashPassword(body.password);
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const [row] = await db.update(users).set(update).where(eq(users.id, id)).returning();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { passwordHash, ...safe } = row;
  return NextResponse.json({ user: safe });
}
