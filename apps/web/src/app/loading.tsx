import Topbar from "@/components/Topbar";
import styles from "./page.module.css";

export default function OverviewLoading() {
  return (
    <>
      <Topbar title="Overview" subtitle="x402 payment activity on Solana" />
      <div className={styles.content}>
        <div className={styles.kpiGrid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rs-skeleton" style={{ height: 108 }} />
          ))}
        </div>
        <div className={styles.chartsRow}>
          <div className={styles.chartsCol}>
            <div className="rs-skeleton" style={{ height: 288 }} />
            <div className="rs-skeleton" style={{ height: 140 }} />
          </div>
          <div className="rs-skeleton" style={{ height: 320 }} />
        </div>
      </div>
    </>
  );
}
