import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const leaderboard = await getLeaderboard();
    return NextResponse.json({ merchants: leaderboard });
  } catch (err) {
    console.error("[api/leaderboard]", err);
    return NextResponse.json({ error: "Failed to load leaderboard data" }, { status: 500 });
  }
}
