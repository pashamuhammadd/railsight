"use client";

/**
 * Renders a formatted value ("$48.2K", "1,234", "87") as a cascade of
 * per-character reveals (see the `.rs-char` / `rs-char-in` keyframes in
 * globals.css). Purely presentational — no counting/tweening of the actual
 * number, so it works safely with any already-formatted string (currency,
 * percentages, compact notation) without needing to re-implement the
 * formatting logic on the client.
 */
export default function AnimatedValue({ value, className }: { value: string; className?: string }) {
  const chars = Array.from(value);

  return (
    <span className={className} aria-label={value}>
      {chars.map((ch, i) => (
        <span key={i} className="rs-char" style={{ animationDelay: `${i * 18}ms` }} aria-hidden="true">
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}
