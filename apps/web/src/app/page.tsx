import Link from "next/link";
import type { Facilitator } from "@railsight/shared";
import { getOverview, getVolumeSpike } from "@/lib/queries";
import { formatCount, formatDeltaPercent, formatPercent, formatUsdcCompact, formatUsdcFull, getInitial, avatarGradientFor, facilitatorLabel, formatWallet } from "@/lib/format";
import Topbar from "@/components/Topbar";
import StatTile, { type DeltaTone } from "@/components/StatTile";
import VolumeChart from "@/components/VolumeChart";
import VolumeSpikeAlert from "@/components/VolumeSpikeAlert";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const FACILITATOR_SWATCH: Record<Facilitator, string> = {
  payai: "var(--fac-payai)",
  coinbase_cdp: "var(--fac-coinbase)",
  unknown: "var(--fac-unknown)",
};

export default async function OverviewPage() {
  const [overview, spike] = await Promise.all([getOverview(30), getVolumeSpike(24)]);
  const { totals, dailyVolume, facilitatorBreakdown, topMerchants } = overview;

  const volumeDelta = formatDeltaPercent(totals.totalVolume, totals.previousVolume);
  const txDelta = formatDeltaPercent(totals.txCount, totals.previousTxCount);
  const flaggedShare = totals.txCount > 0 ? totals.flaggedCount / totals.txCount : 0;

  const kpis: Array<{ label: string; value: string; delta?: string | null; deltaTone: DeltaTone; deltaCaption: string }> = [
    {
      label: `Total volume (${overview.windowDays}d)`,
      value: formatUsdcCompact(totals.totalVolume),
      delta: volumeDelta,
      deltaTone: totals.totalVolume >= totals.previousVolume ? "good" : "bad",
      deltaCaption: `vs prior ${overview.windowDays}d`,
    },
    {
      label: `Transactions (${overview.windowDays}d)`,
      value: formatCount(totals.txCount),
      delta: txDelta,
      deltaTone: totals.txCount >= totals.previousTxCount ? "good" : "bad",
      deltaCaption: `vs prior ${overview.windowDays}d`,
    },
    {
      label: "Active merchants",
      value: formatCount(totals.merchantCount),
      delta: null,
      deltaTone: "neutral",
      deltaCaption: "tracked wallets",
    },
    {
      label: "Flagged transactions",
      value: formatCount(totals.flaggedCount),
      delta: totals.flaggedCount > 0 ? formatPercent(flaggedShare, 1) : "0%",
      deltaTone: totals.flaggedCount > 0 ? "bad" : "good",
      deltaCaption: "of total transactions",
    },
  ];

  const hasFacilitatorVolume = facilitatorBreakdown.some((f) => f.volume > 0);

  return (
    <>
      <Topbar title="Overview" subtitle="x402 payment activity on Solana" rangeLabel={`Last ${overview.windowDays} days`} />

      <div className={styles.content}>
        <VolumeSpikeAlert spike={spike} />

        <div className={styles.kpiGrid}>
          {kpis.map((kpi) => (
            <StatTile key={kpi.label} label={kpi.label} value={kpi.value} delta={kpi.delta} deltaTone={kpi.deltaTone} deltaCaption={kpi.deltaCaption} />
          ))}
        </div>

        <div className={styles.chartsRow}>
          <div className={styles.chartsCol}>
            <div className={styles.panel}>
              <div className={styles.panelHead}>
                <div className={styles.panelTitle}>Daily settled volume</div>
                <div className={`rs-num ${styles.unit}`}>USDC</div>
              </div>
              <div className={styles.panelSubtitle}>Sum of settled x402 payments across tracked merchants, per day</div>
              <VolumeChart points={dailyVolume} />
            </div>

            <div className={styles.panel}>
              <div className={styles.panelTitle}>Facilitator share</div>
              <div className={styles.panelSubtitle}>Share of {overview.windowDays}-day volume by settling facilitator</div>

              {hasFacilitatorVolume ? (
                <>
                  <div className={styles.shareBar}>
                    {facilitatorBreakdown
                      .filter((f) => f.share > 0)
                      .map((f) => (
                        <div key={f.facilitator} style={{ width: `${Math.max(f.share * 100, 1)}%`, background: FACILITATOR_SWATCH[f.facilitator] }} />
                      ))}
                  </div>
                  <div className={styles.shareLegend}>
                    {facilitatorBreakdown.map((f) => (
                      <div key={f.facilitator} className={styles.shareLegendItem}>
                        <span className={styles.shareSwatch} style={{ background: FACILITATOR_SWATCH[f.facilitator] }} />
                        {facilitatorLabel(f.facilitator)} <span className={`rs-num ${styles.shareValue}`}>{formatPercent(f.share)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className={styles.emptyRow}>No settled volume in this window yet.</div>
              )}
            </div>
          </div>

          <div className={styles.sidePanel}>
            <div className={styles.sidePanelHead}>
              <div className={styles.panelTitle}>Top merchants</div>
              <Link href="/leaderboard" className={styles.viewAllLink}>
                View all <span className={styles.arrow}>→</span>
              </Link>
            </div>

            {topMerchants.length > 0 ? (
              topMerchants.map((m) => (
                <Link key={m.id} href={`/merchant/${m.id}`} className={styles.merchantRow}>
                  <div className={`rs-num ${styles.merchantAvatar}`} style={{ background: avatarGradientFor(m.payeeWallet) }}>
                    {getInitial(m.label, m.payeeWallet)}
                  </div>
                  <div className={styles.merchantInfo}>
                    <div className={styles.merchantLabel}>{m.label ?? formatWallet(m.payeeWallet)}</div>
                    <div className={styles.merchantWallet}>{formatWallet(m.payeeWallet)}</div>
                  </div>
                  <div className={`rs-num ${styles.merchantVolume}`}>{formatUsdcFull(m.volume)}</div>
                </Link>
              ))
            ) : (
              <div className={styles.emptyRow}>No merchant volume yet — run the ingestion worker to pull in transactions.</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
