import Link from "next/link";
import { notFound } from "next/navigation";
import { getMerchantDetail } from "@/lib/queries";
import {
  formatCount,
  formatDateTime,
  formatUsdcFull,
  formatWallet,
  getInitial,
  avatarGradientFor,
  flagReasonLabel,
} from "@/lib/format";
import FacilitatorChip from "@/components/FacilitatorChip";
import StatTile from "@/components/StatTile";
import VolumeChart from "@/components/VolumeChart";
import AnimatedValue from "@/components/AnimatedValue";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

function scoreColor(score: number): string {
  if (score >= 80) return "var(--status-good-text)";
  if (score >= 40) return "var(--status-warning-text)";
  return "var(--status-critical-text)";
}

export default async function MerchantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getMerchantDetail(id, 30);

  if (!detail) {
    notFound();
  }

  const { merchant, flags, dailyVolume, recentTransactions } = detail;
  const payerDelta = detail.currentPayers - detail.previousPayers;
  const payerDeltaLabel = payerDelta === 0 ? "flat" : payerDelta > 0 ? `+${payerDelta}` : `${payerDelta}`;

  return (
    <>
      <div className={styles.backBar}>
        <Link href="/leaderboard" className={styles.backLink}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Leaderboard
        </Link>
        <div className={`rs-num ${styles.avatar}`}>P</div>
      </div>

      <div className={styles.content}>
        <div className={styles.headerCard}>
          <div className={`rs-num ${styles.headerAvatar}`} style={{ background: avatarGradientFor(merchant.payeeWallet) }}>
            {getInitial(merchant.label, merchant.payeeWallet)}
          </div>
          <div className={styles.headerInfo}>
            <div className={styles.headerTitleRow}>
              <div className={styles.headerName}>{merchant.label ?? formatWallet(merchant.payeeWallet)}</div>
              <span className={styles.rankBadge}>Rank #{merchant.rank}</span>
              <FacilitatorChip facilitator={merchant.facilitator} />
            </div>
            <div className={`rs-num ${styles.headerWallet}`}>{merchant.payeeWallet}</div>
          </div>

          <div className={styles.scorePanel}>
            <div className={styles.scoreHead}>
              <span className={styles.scoreLabel}>Verified-volume score</span>
              <span className={`rs-num ${styles.scoreValue}`}>
                <AnimatedValue value={String(detail.verifiedScore)} />
                <span className={styles.scoreMax}>/100</span>
              </span>
            </div>
            <div className={styles.scoreTrack}>
              <div className={styles.scoreFill} style={{ width: `${detail.verifiedScore}%`, background: scoreColor(detail.verifiedScore) }} />
            </div>
            <div className={styles.scoreCaption}>{detail.scoreExplanation}</div>
          </div>
        </div>

        {flags.length > 0 ? (
          flags.map((flag, i) => (
            <div key={`${flag.reason}-${i}`} className={styles.flagCallout}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" className={styles.flagIcon}>
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
                <path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
              </svg>
              <div style={{ flex: 1 }}>
                <div className={styles.flagHeadline}>Flagged — {flag.headline}</div>
                <div className={styles.flagDetail}>{flag.detail}</div>
              </div>
              {flag.occurredAt ? <span className={`rs-num ${styles.flagDate}`}>{formatDateTime(flag.occurredAt)}</span> : null}
            </div>
          ))
        ) : (
          <div className={styles.cleanCallout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            No active flags on this merchant.
          </div>
        )}

        <div className={styles.kpiGrid}>
          <StatTile label={`Total revenue (${detail.windowDays}d)`} value={formatUsdcFull(detail.currentVolume)} deltaTone="neutral" />
          <StatTile label={`Transactions (${detail.windowDays}d)`} value={formatCount(detail.currentTxCount)} deltaTone="neutral" />
          <StatTile
            label="Unique payer wallets"
            value={formatCount(detail.currentPayers)}
            delta={payerDeltaLabel}
            deltaTone={merchant.isFlagged ? "bad" : "neutral"}
            deltaCaption={`vs prior ${detail.windowDays}d`}
          />
        </div>

        <div className={styles.panel}>
          <div className={styles.panelTitle}>Revenue trend</div>
          <div className={styles.panelSubtitle}>Daily settled volume for this merchant, last {detail.windowDays} days</div>
          <VolumeChart points={dailyVolume} />
        </div>

        <div className={styles.table}>
          <div className={styles.tableTitle}>Recent transactions</div>
          <div className={styles.headerRow}>
            <div>Signature</div>
            <div>Date</div>
            <div>Payer wallet</div>
            <div>Amount</div>
            <div>Facilitator</div>
          </div>

          {recentTransactions.length > 0 ? (
            recentTransactions.map((tx) => (
              <div key={tx.id} className={styles.row} title={tx.isFlagged ? (flagReasonLabel(tx.flagReason) ?? undefined) : undefined}>
                <div className={`rs-num ${styles.sig}`}>{formatWallet(tx.id)}</div>
                <div className={styles.date}>{formatDateTime(tx.blockTime)}</div>
                <div className={`rs-num ${styles.payer}`}>{formatWallet(tx.payerWallet)}</div>
                <div className={`rs-num ${styles.amount}`}>{formatUsdcFull(tx.amountUsdc)}</div>
                <div>
                  <FacilitatorChip facilitator={tx.facilitator} />
                </div>
              </div>
            ))
          ) : (
            <div className={styles.emptyRow}>No transactions recorded for this merchant yet.</div>
          )}
        </div>
      </div>
    </>
  );
}
