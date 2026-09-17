import type { Facilitator } from "@railsight/shared";

/** "$8,420.10" — used for table cells / lists where precision matters. */
export function formatUsdcFull(amount: number): string {
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** "$48.2K" — used for big KPI tiles where a compact number reads better. */
export function formatUsdcCompact(amount: number): string {
  if (Math.abs(amount) < 1000) return formatUsdcFull(amount);
  return `$${amount.toLocaleString("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  })}`;
}

export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

/** "7xKX...p2Qm" — truncated middle, like the design mockups. */
export function formatWallet(wallet: string): string {
  if (wallet.length <= 10) return wallet;
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

/** "Sep 12" — chart axis / short date labels. */
export function formatDayLabel(day: string | Date): string {
  const d = typeof day === "string" ? new Date(day) : day;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function formatPercent(fraction: number, digits = 0): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

/** Signed percent change for KPI deltas, e.g. "+18.4%" / "-6%" / "0%". */
export function formatDeltaPercent(current: number, previous: number): string | null {
  if (previous === 0) {
    if (current === 0) return null; // nothing to compare — hide the delta
    return "New";
  }
  const change = (current - previous) / previous;
  const sign = change > 0 ? "+" : change < 0 ? "" : "";
  return `${sign}${(change * 100).toFixed(1)}%`;
}

export function getInitial(label: string | null, wallet: string): string {
  const source = label?.trim() || wallet;
  return source.charAt(0).toUpperCase() || "?";
}

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#8B5CF6,#5B3FD1)",
  "linear-gradient(135deg,#2DD4BF,#1B8F82)",
  "linear-gradient(135deg,#9085E9,#5B3FD1)",
  "linear-gradient(135deg,#2DD4BF,#8B5CF6)",
  "linear-gradient(135deg,#8B5CF6,#2DD4BF)",
  "linear-gradient(135deg,#9085E9,#2DD4BF)",
  "linear-gradient(135deg,#5B3FD1,#2DD4BF)",
  "linear-gradient(135deg,#2DD4BF,#5B3FD1)",
];

/** Deterministic (same wallet always gets the same color) so it's stable across reloads/pages. */
export function avatarGradientFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
}

export const FACILITATOR_LABELS: Record<Facilitator, string> = {
  payai: "PayAI",
  coinbase_cdp: "Coinbase CDP",
  unknown: "Unattributed",
};

export function facilitatorLabel(facilitator: string): string {
  return FACILITATOR_LABELS[facilitator as Facilitator] ?? facilitator;
}
