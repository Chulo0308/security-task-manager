import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { generateTotpSecret } from "@/lib/twofa";
import QRCode from "qrcode";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { base32, otpauthUrl } = generateTotpSecret(session.email);
  await db.update(users).set({ totpSecret: base32, totpEnabled: false }).where(eq(users.id, session.id));

  const qrDataUrl = await QRCode.toDataURL(otpauthUrl);
  return NextResponse.json({ secret: base32, qrDataUrl });
}
