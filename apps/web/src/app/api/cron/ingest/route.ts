import { NextRequest, NextResponse } from "next/server";
import { runDailyIngestCycle } from "@/lib/ingest-cron";

export const dynamic = "force-dynamic";
// Vercel Hobby cron functions get up to 60s — a full cycle (discovery +
// polling every tracked merchant + flagging) should comfortably fit for a
// hackathon-scale merchant list, but this is the ceiling if it doesn't.
export const maxDuration = 60;

/**
 * Vercel Cron target (see vercel.json — "0 3 * * *", once daily). This is
 * what makes ingestion run continuously instead of only when Pasha's
 * laptop happens to have `npm run dev` running in packages/ingestion.
 *
 * Optional auth: set CRON_SECRET in Vercel's env vars and this checks it
 * against the `Authorization: Bearer <value>` header Vercel Cron sends
 * automatically for authenticated cron jobs. If CRON_SECRET is unset, the
 * check is skipped (fine for a hackathon demo where this URL isn't
 * published anywhere) — set it before sharing this deployment publicly,
 * since an unauthenticated GET here can trigger real Helius API usage.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await runDailyIngestCycle();
    console.log("[cron/ingest]", result);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/ingest] failed:", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
