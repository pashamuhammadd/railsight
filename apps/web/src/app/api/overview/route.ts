import { NextRequest, NextResponse } from "next/server";
import { getOverview } from "@/lib/queries";

// Data changes as new x402 transactions land, so never let Next.js cache
// a stale snapshot of it.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const windowParam = request.nextUrl.searchParams.get("days");
  const windowDays = windowParam ? Number(windowParam) : 30;

  if (!Number.isFinite(windowDays) || windowDays <= 0) {
    return NextResponse.json({ error: "`days` must be a positive number" }, { status: 400 });
  }

  try {
    const overview = await getOverview(windowDays);
    return NextResponse.json(overview);
  } catch (err) {
    console.error("[api/overview]", err);
    return NextResponse.json({ error: "Failed to load overview data" }, { status: 500 });
  }
}
