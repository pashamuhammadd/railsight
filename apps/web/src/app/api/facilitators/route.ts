import { NextResponse } from "next/server";
import { getFacilitatorStats } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const facilitators = await getFacilitatorStats();
    return NextResponse.json({ facilitators });
  } catch (err) {
    console.error("[api/facilitators]", err);
    return NextResponse.json({ error: "Failed to load facilitator data" }, { status: 500 });
  }
}
