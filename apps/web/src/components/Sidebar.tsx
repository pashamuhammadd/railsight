"use client";

import { usePathname } from "next/navigation";
import styles from "./Sidebar.module.css";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Overview",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/leaderboard",
    label: "Leaderboard",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 21V13" />
        <path d="M14 21V9" />
        <path d="M20 21V5" />
        <path d="M2 21V17" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.mark}>
          <svg viewBox="0 0 100 100" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="40" r="22" fill="none" stroke="#FFFFFF" strokeWidth="9" />
            <rect x="30" y="44" width="6" height="8" rx="1.5" fill="#FFFFFF" />
            <rect x="38" y="38" width="6" height="14" rx="1.5" fill="#FFFFFF" />
            <rect x="46" y="30" width="6" height="22" rx="1.5" fill="#FFFFFF" />
          </svg>
        </div>
        <span className={`rs-num ${styles.brandName}`}>RailSight</span>
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <a key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={active ? styles.navLinkActive : styles.navLink}>
              {item.icon}
              {active ? <span className={styles.navLinkActiveLabel}>{item.label}</span> : item.label}
            </a>
          );
        })}

        <div className={styles.navSoon}>
          <span className={styles.navSoonLabel}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4l2.5 2.5" />
            </svg>
            Verified API
          </span>
          <span className={styles.soonBadge}>SOON</span>
        </div>
        <div className={styles.navSoon}>
          <span className={styles.navSoonLabel}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
            Settings
          </span>
          <span className={styles.soonBadge}>SOON</span>
        </div>
      </nav>

      <div className={styles.status}>
        <div className={styles.statusRow}>
          <span className={styles.statusDot} />
          Solana Mainnet
        </div>
        <div className={styles.statusVersion}>RailSight v0.1 — Week 2 build</div>
      </div>
    </div>
  );
}
