import Link from "next/link";
import styles from "./page.module.css";

export default function MerchantDetailLoading() {
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
        <div className="rs-skeleton" style={{ height: 120 }} />
        <div className="rs-skeleton" style={{ height: 80 }} />
        <div className={styles.kpiGrid}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rs-skeleton" style={{ height: 96 }} />
          ))}
        </div>
        <div className="rs-skeleton" style={{ height: 240 }} />
        <div className="rs-skeleton" style={{ height: 260 }} />
      </div>
    </>
  );
}
