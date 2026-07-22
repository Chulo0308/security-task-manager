import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { floors, siteSettings } from "@/db/schema";
import { getSession, isAdmin } from "@/lib/auth";

async function loadSite() {
  let [settings] = await db.select().from(siteSettings).where(eq(siteSettings.id, "site")).limit(1);
  if (!settings) {
    [settings] = await db
      .insert(siteSettings)
      .values({
        id: "site",
        siteName: "8 Bishopsgate",
        addressLine1: "8 Bishopsgate, Undershaft Road",
        borough: "City of London",
        city: "London",
        postcode: "EC2N 4AY",
        country: "United Kingdom",
        securityTier: "Enhanced",
      })
      .returning();
  }
  const floorRows = await db.select().from(floors).orderBy(asc(floors.level));
  return { settings, floors: floorRows };
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await loadSite());
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const update: Record<string, any> = { updatedAt: new Date() };
  for (const key of [
    "siteName", "addressLine1", "addressLine2", "borough", "city",
    "postcode", "country", "securityTier", "phone", "email", "websiteUrl", "notes",
  ]) {
    if (body[key] !== undefined) update[key] = body[key] === "" ? null : String(body[key]);
  }

  await db.insert(siteSettings).values({ id: "site", siteName: update.siteName || "8 Bishopsgate" }).onConflictDoNothing();
  const [row] = await db.update(siteSettings).set(update).where(eq(siteSettings.id, "site")).returning();

  return NextResponse.json({ settings: row });
}
