import Link from "next/link";
import { getLeaderboard } from "@/lib/queries";
import { formatCount, formatUsdcFull, getInitial, avatarGradientFor, formatWallet, flagReasonLabel } from "@/lib/format";
import Topbar from "@/components/Topbar";
import FacilitatorChip from "@/components/FacilitatorChip";
import StatusBadge from "@/components/StatusBadge";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const merchants = await getLeaderboard();

  return (
    <>
      <Topbar title="Revenue leaderboard" subtitle="Merchants ranked by verified x402 revenue" />

      <div className={styles.content}>
        <div className={styles.table}>
          <div className={styles.headerRow}>
            <div>Rank</div>
            <div>Merchant</div>
            <div>Facilitator</div>
            <div>All-time volume</div>
            <div>Tx count</div>
            <div>Status</div>
          </div>

          {merchants.length > 0 ? (
            merchants.map((m) => (
              <Link key={m.id} href={`/merchant/${m.id}`} className={styles.row}>
                <div className={`rs-num ${styles.rank}`}>{m.rank}</div>
                <div className={styles.merchant}>
                  <div className={`rs-num ${styles.avatar}`} style={{ background: avatarGradientFor(m.payeeWallet) }}>
                    {getInitial(m.label, m.payeeWallet)}
                  </div>
                  <div className={styles.merchantInfo}>
                    <div className={styles.merchantLabel}>{m.label ?? formatWallet(m.payeeWallet)}</div>
                    <div className={styles.merchantWallet}>{formatWallet(m.payeeWallet)}</div>
                  </div>
                </div>
                <div>
                  <FacilitatorChip facilitator={m.facilitator} />
                </div>
                <div className={`rs-num ${styles.volume}`}>{formatUsdcFull(m.volume)}</div>
                <div className={`rs-num ${styles.txCount}`}>{formatCount(m.txCount)}</div>
                <div>
                  <StatusBadge flagged={m.flagged} reason={flagReasonLabel(m.flagReason)} />
                </div>
              </Link>
            ))
          ) : (
            <div className={styles.empty}>
              No tracked merchants yet — add wallets to the <code>merchants</code> table (or set{" "}
              <code>SEED_MERCHANT_WALLETS</code> for the ingestion worker) to see them here.
            </div>
          )}
        </div>

        {merchants.length > 0 ? (
          <div className={styles.footer}>
            <div className={styles.footerCaption}>
              Showing {merchants.length} merchant{merchants.length === 1 ? "" : "s"} — click a row for flag details
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
