import { NextResponse } from "next/server";
import { getVerifiedVolume } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * PRD.md P1 item 6 — public "verified-volume" trust-score stub. A merchant
 * (or anyone) can call this with a merchant id to get a basic, explainable
 * trust score for that merchant's reported x402 volume. Not authenticated,
 * not rate-limited, and not yet metered over x402 itself — that's the
 * PRD's bonus "dogfooding" stretch goal, intentionally out of scope here.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ merchantId: string }> }) {
  const { merchantId } = await params;

  try {
    const result = await getVerifiedVolume(merchantId);
    if (!result) {
      return NextResponse.json({ error: `No merchant with id "${merchantId}"` }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/verified-volume/:merchantId]", err);
    return NextResponse.json({ error: "Failed to compute verified volume" }, { status: 500 });
  }
}
