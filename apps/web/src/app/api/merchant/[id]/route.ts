import { NextRequest, NextResponse } from "next/server";
import { getMerchantDetail } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const windowParam = request.nextUrl.searchParams.get("days");
  const windowDays = windowParam ? Number(windowParam) : 30;

  if (!Number.isFinite(windowDays) || windowDays <= 0) {
    return NextResponse.json({ error: "`days` must be a positive number" }, { status: 400 });
  }

  try {
    const detail = await getMerchantDetail(id, windowDays);
    if (!detail) {
      return NextResponse.json({ error: `No merchant with id "${id}"` }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (err) {
    console.error("[api/merchant/:id]", err);
    return NextResponse.json({ error: "Failed to load merchant data" }, { status: 500 });
  }
}
