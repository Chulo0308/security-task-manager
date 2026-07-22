import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { bootstrapContent } from "@/lib/seed";

// Admin-only: loads starter content (tasks, announcements, floors, site profile)
// attributed to the calling administrator. Runs only on an empty deployment.
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    await bootstrapContent(session.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Bootstrap failed" },
      { status: 409 }
    );
  }
}
