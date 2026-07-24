import { NextResponse } from "next/server";
import { seedDatabase, getDemoAccounts, DEMO_USERS } from "@/lib/seed";
import { db } from "@/db";
import { users } from "@/db/schema";
import { count } from "drizzle-orm";

const DEMO_EMAILS = new Set(DEMO_USERS.map((u) => u.email.toLowerCase()));

// Demo seeding is a local development tool. In production this route does not
// exist — it must never publish demo credentials on a public deployment.
function blockedInProduction() {
  return process.env.NODE_ENV === "production"
    ? NextResponse.json({ error: "Not found" }, { status: 404 })
    : null;
}

export async function POST() {
  const blocked = blockedInProduction();
  if (blocked) return blocked;

  try {
    // Guard: never wipe live accounts. Reseeding is only allowed when the
    // database is empty or contains demo accounts exclusively.
    const existing = await db.select({ email: users.email }).from(users);
    const liveAccounts = existing.filter((u) => !DEMO_EMAILS.has(u.email.toLowerCase()));
    if (existing.length > 0 && liveAccounts.length > 0) {
      return NextResponse.json(
        {
          error:
            "Reseed blocked: live accounts exist in this database. Demo data can only be reset on a fresh or demo-only deployment.",
        },
        { status: 409 }
      );
    }
    await seedDatabase();
    return NextResponse.json({ ok: true, accounts: await getDemoAccounts() });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  const blocked = blockedInProduction();
  if (blocked) return blocked;

  const [row] = await db.select({ value: count() }).from(users);
  const n = row?.value ?? 0;
  return NextResponse.json({
    userCount: n,
    needsSeed: n === 0,
    accounts: await getDemoAccounts(),
  });
}