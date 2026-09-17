import Topbar from "@/components/Topbar";
import styles from "./page.module.css";

export default function LeaderboardLoading() {
  return (
    <>
      <Topbar title="Revenue leaderboard" subtitle="Merchants ranked by verified x402 revenue" />
      <div className={styles.content}>
        <div className="rs-skeleton" style={{ height: 420 }} />
      </div>
    </>
  );
}
