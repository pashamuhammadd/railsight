import styles from "./StatusBadge.module.css";

export default function StatusBadge({ flagged }: { flagged: boolean }) {
  if (flagged) {
    return (
      <span className={`${styles.badge} ${styles.flagged}`}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
          <path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
        </svg>
        Flagged
      </span>
    );
  }

  return (
    <span className={`${styles.badge} ${styles.clean}`}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
      Clean
    </span>
  );
}
