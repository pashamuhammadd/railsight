import Link from "next/link";
import { getLeaderboard, getPayerLeaderboard } from "@/lib/queries";
import { formatCount, formatUsdcFull, getInitial, avatarGradientFor, formatWallet, flagReasonLabel, formatDateTime } from "@/lib/format";
import Topbar from "@/components/Topbar";
import FacilitatorChip from "@/components/FacilitatorChip";
import StatusBadge from "@/components/StatusBadge";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

type LeaderboardView = "merchants" | "payers";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const activeView: LeaderboardView = view === "payers" ? "payers" : "merchants";

  return (
    <>
      <Topbar
        title="Revenue leaderboard"
        subtitle={activeView === "payers" ? "Wallets ranked by total x402 spend" : "Merchants ranked by verified x402 revenue"}
      />

      <div className={styles.content}>
        <div className={styles.tabs}>
          <Link href="/leaderboard" className={`${styles.tab} ${activeView === "merchants" ? styles.tabActive : ""}`}>
            Merchants
          </Link>
          <Link href="/leaderboard?view=payers" className={`${styles.tab} ${activeView === "payers" ? styles.tabActive : ""}`}>
            Top payers
          </Link>
        </div>

        {activeView === "merchants" ? <MerchantLeaderboard /> : <PayerLeaderboard />}
      </div>
    </>
  );
}

async function MerchantLeaderboard() {
  const merchants = await getLeaderboard();

  return (
    <>
      <div className={styles.table}>
        <div className={`${styles.headerRow} ${styles.headerRowMerchants}`}>
          <div>Rank</div>
          <div>Merchant</div>
          <div>Facilitator</div>
          <div>All-time volume</div>
          <div>Tx count</div>
          <div>Status</div>
        </div>

        {merchants.length > 0 ? (
          merchants.map((m) => (
            <Link key={m.id} href={`/merchant/${m.id}`} className={`${styles.row} ${styles.rowMerchants}`}>
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
    </>
  );
}

async function PayerLeaderboard() {
  const payers = await getPayerLeaderboard();

  return (
    <>
      <div className={styles.table}>
        <div className={`${styles.headerRow} ${styles.headerRowPayers}`}>
          <div>Rank</div>
          <div>Payer wallet</div>
          <div>Total spend</div>
          <div>Tx count</div>
          <div>Merchants paid</div>
          <div>Last seen</div>
        </div>

        {payers.length > 0 ? (
          payers.map((p) => (
            <div key={p.payerWallet} className={`${styles.row} ${styles.rowPayers}`}>
              <div className={`rs-num ${styles.rank}`}>{p.rank}</div>
              <div className={styles.merchant}>
                <div className={`rs-num ${styles.avatar}`} style={{ background: avatarGradientFor(p.payerWallet) }}>
                  {getInitial(null, p.payerWallet)}
                </div>
                <div className={styles.merchantInfo}>
                  <div className={styles.merchantLabel}>{formatWallet(p.payerWallet)}</div>
                  <div className={styles.merchantWallet}>since {formatDateTime(p.firstSeen)}</div>
                </div>
              </div>
              <div className={`rs-num ${styles.volume}`}>{formatUsdcFull(p.volume)}</div>
              <div className={`rs-num ${styles.txCount}`}>{formatCount(p.txCount)}</div>
              <div className={`rs-num ${styles.txCount}`}>{formatCount(p.merchantCount)}</div>
              <div className={styles.merchantWallet}>{formatDateTime(p.lastSeen)}</div>
            </div>
          ))
        ) : (
          <div className={styles.empty}>
            No payer activity yet — once transactions come in, the wallets paying the most across all
            merchants will show up here.
          </div>
        )}
      </div>

      {payers.length > 0 ? (
        <div className={styles.footer}>
          <div className={styles.footerCaption}>
            Showing {payers.length} payer wallet{payers.length === 1 ? "" : "s"}, ranked by total spend across all merchants
          </div>
        </div>
      ) : null}
    </>
  );
}
