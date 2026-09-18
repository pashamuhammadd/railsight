import type { DailyVolumePoint } from "@/lib/queries";
import { formatDayLabel, formatUsdcFull } from "@/lib/format";
import styles from "./VolumeChart.module.css";

const WIDTH = 600;
const HEIGHT = 220;
const CHART_BOTTOM = 200;
const CHART_TOP = 30;

/** Static SVG line/area chart built straight from real daily_volume rows — no client JS, no charting library. */
export default function VolumeChart({ points }: { points: DailyVolumePoint[] }) {
  if (points.length === 0) {
    return (
      <div className={styles.empty}>
        No settled x402 transactions in this window yet. This fills in as ingestion runs.
      </div>
    );
  }

  const maxVolume = Math.max(...points.map((p) => p.volume), 0.01);
  const stepX = points.length > 1 ? WIDTH / (points.length - 1) : 0;
  const coords = points.map((p, i) => ({
    x: points.length > 1 ? i * stepX : WIDTH / 2,
    y: CHART_BOTTOM - (p.volume / maxVolume) * (CHART_BOTTOM - CHART_TOP),
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const areaPath =
    coords.length > 1
      ? `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${CHART_BOTTOM} L${coords[0].x.toFixed(1)},${CHART_BOTTOM} Z`
      : "";

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const lastCoord = coords[coords.length - 1];

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height={HEIGHT} xmlns="http://www.w3.org/2000/svg" style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id="volFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
        </linearGradient>
      </defs>

      <line className={styles.gridLine} x1="0" y1={CHART_BOTTOM} x2={WIDTH} y2={CHART_BOTTOM} stroke="#26262F" strokeWidth="1" />
      <line
        className={styles.gridLine}
        x1="0"
        y1={(CHART_BOTTOM + CHART_TOP) / 2}
        x2={WIDTH}
        y2={(CHART_BOTTOM + CHART_TOP) / 2}
        stroke="#1D1D28"
        strokeWidth="1"
        style={{ animationDelay: "80ms" }}
      />
      <line className={styles.gridLine} x1="0" y1={CHART_TOP} x2={WIDTH} y2={CHART_TOP} stroke="#1D1D28" strokeWidth="1" style={{ animationDelay: "140ms" }} />

      {areaPath ? <path d={areaPath} fill="url(#volFill)" className={styles.area} /> : null}

      {coords.length > 1 ? (
        <>
          <path
            d={linePath}
            fill="none"
            stroke="#A78BFA"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            pathLength={1}
            className={styles.line}
          />
          <circle cx={lastCoord.x} cy={lastCoord.y} r="4.5" fill="#0B0B12" stroke="#7FEFDD" strokeWidth="2.5" className={styles.lastPoint} />
        </>
      ) : (
        <circle cx={coords[0].x} cy={coords[0].y} r="4.5" fill="#0B0B12" stroke="#7FEFDD" strokeWidth="2.5" className={styles.lastPoint} />
      )}

      <text x="0" y={HEIGHT - 4} fontSize="11" fill="#6E6F7C" fontFamily="Plus Jakarta Sans, sans-serif" className={styles.axisLabel}>
        {formatDayLabel(firstPoint.day)}
      </text>
      <text
        x={WIDTH}
        y={HEIGHT - 4}
        fontSize="11"
        fill="#6E6F7C"
        fontFamily="Plus Jakarta Sans, sans-serif"
        textAnchor="end"
        className={styles.axisLabel}
        style={{ animationDelay: "60ms" }}
      >
        {formatDayLabel(lastPoint.day)}
      </text>

      <text
        x={lastCoord.x}
        y={Math.max(lastCoord.y - 10, 14)}
        fontSize="12"
        fill="#F5F5F7"
        fontFamily="Space Grotesk, sans-serif"
        fontWeight="600"
        textAnchor="end"
        className={styles.priceLabel}
      >
        {formatUsdcFull(lastPoint.volume)}
      </text>
    </svg>
  );
}
