import type { VolumeSpike } from "@/lib/queries";
import { formatUsdcCompact, formatCount } from "@/lib/format";
import styles from "./VolumeSpikeAlert.module.css";

/**
 * Judge-facing "something's happening right now" banner — renders only
 * when getVolumeSpike() (apps/web/src/lib/queries.ts) says the trailing
 * window's settled volume is running well above the recent baseline.
 * Deliberately framed as a positive signal (adoption surge), not a fraud
 * warning — that's what the non-organic-activity heuristics/StatusBadge
 * are for.
 */
export default function VolumeSpikeAlert({ spike }: { spike: VolumeSpike }) {
  if (!spike.isSpiking || spike.multiplier === null) return null;

  return (
    <div className={styles.banner} role="status">
      <span className={styles.dot} aria-hidden="true" />
      <div className={styles.body}>
        <div className={styles.headline}>
          Volume spike: {spike.multiplier.toFixed(1)}x the usual pace over the last {spike.windowHours}h
        </div>
        <div className={styles.detail}>
          {formatUsdcCompact(spike.currentVolume)} settled across {formatCount(spike.currentTxCount)} transaction
          {spike.currentTxCount === 1 ? "" : "s"} in the last {spike.windowHours}h. Well above the recent daily
          average.
        </div>
      </div>
    </div>
  );
}
