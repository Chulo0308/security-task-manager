import { NextResponse } from "next/server";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

// Public: returns site name + location only, no auth required.
// Used by the login page (shown before anyone is logged in).
export async function GET() {
  try {
    const [row] = await db
      .select({ siteName: siteSettings.siteName, postcode: siteSettings.postcode, city: siteSettings.city })
      .from(siteSettings)
      .where(eq(siteSettings.id, "site"))
      .limit(1);
    return NextResponse.json({
      siteName: row?.siteName || "8 Bishopsgate",
      postcode: row?.postcode || "",
      city: row?.city || "London",
    });
  } catch {
    return NextResponse.json({ siteName: "8 Bishopsgate", postcode: "", city: "London" });
  }
}
