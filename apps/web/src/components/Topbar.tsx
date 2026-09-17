import styles from "./Topbar.module.css";

export default function Topbar({
  title,
  subtitle,
  rangeLabel,
}: {
  title: string;
  subtitle: string;
  rangeLabel?: string;
}) {
  return (
    <div className={styles.topbar}>
      <div>
        <div className={`rs-num ${styles.title}`}>{title}</div>
        <div className={styles.subtitle}>{subtitle}</div>
      </div>
      <div className={styles.right}>
        {rangeLabel ? (
          <div className={styles.rangeBadge}>
            {rangeLabel}
          </div>
        ) : null}
        <div className={styles.divider} />
        <div className={`rs-num ${styles.avatar}`}>P</div>
      </div>
    </div>
  );
}
