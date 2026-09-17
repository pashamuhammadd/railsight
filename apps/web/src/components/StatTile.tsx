import styles from "./StatTile.module.css";

export type DeltaTone = "good" | "bad" | "neutral";

const DELTA_CLASS: Record<DeltaTone, string> = {
  good: styles.deltaGood,
  bad: styles.deltaBad,
  neutral: styles.deltaNeutral,
};

export default function StatTile({
  label,
  value,
  delta,
  deltaTone = "neutral",
  deltaCaption,
}: {
  label: string;
  value: string;
  delta?: string | null;
  deltaTone?: DeltaTone;
  deltaCaption?: string;
}) {
  return (
    <div className={styles.tile}>
      <div className={styles.label}>{label}</div>
      <div className={`rs-num ${styles.value}`}>{value}</div>
      <div className={styles.deltaRow}>
        {delta ? <span className={`${styles.delta} ${DELTA_CLASS[deltaTone]}`}>{delta}</span> : null}
        {deltaCaption ? <span className={styles.caption}>{deltaCaption}</span> : null}
      </div>
    </div>
  );
}
