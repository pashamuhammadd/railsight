import type { Facilitator } from "@railsight/shared";
import { facilitatorLabel } from "@/lib/format";
import styles from "./FacilitatorChip.module.css";

const COLORS: Record<Facilitator, { bg: string; text: string }> = {
  payai: { bg: "var(--fac-payai-bg)", text: "var(--fac-payai-text)" },
  coinbase_cdp: { bg: "var(--fac-coinbase-bg)", text: "var(--fac-coinbase-text)" },
  unknown: { bg: "var(--fac-unknown-bg)", text: "var(--fac-unknown-text)" },
};

export default function FacilitatorChip({ facilitator }: { facilitator: Facilitator }) {
  const { bg, text } = COLORS[facilitator] ?? COLORS.unknown;
  return (
    <span className={styles.chip} style={{ background: bg, color: text }}>
      <span className={styles.dot} style={{ background: text }} />
      {facilitatorLabel(facilitator)}
    </span>
  );
}
