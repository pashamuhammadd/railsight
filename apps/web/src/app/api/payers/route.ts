import { NextResponse } from "next/server";
import { getPayerLeaderboard } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payers = await getPayerLeaderboard();
    return NextResponse.json({ payers });
  } catch (err) {
    console.error("[api/payers]", err);
    return NextResponse.json({ error: "Failed to load payer leaderboard data" }, { status: 500 });
  }
}
