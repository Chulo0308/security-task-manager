import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDemoAccounts } from "@/lib/seed";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({ user });
}

// Expose demo credentials for easy login
export async function GET_DEMO() {
  return NextResponse.json({ accounts: await getDemoAccounts() });
}
