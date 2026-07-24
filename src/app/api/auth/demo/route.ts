import { NextResponse } from "next/server";
import { getDemoAccounts } from "@/lib/seed";

// Development only — demo credentials are never exposed in production.
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ accounts: await getDemoAccounts() });
}