import { NextRequest, NextResponse } from "next/server";
import { getDemoAccounts } from "@/lib/seed";

export async function GET() {
  return NextResponse.json({ accounts: await getDemoAccounts() });
}
