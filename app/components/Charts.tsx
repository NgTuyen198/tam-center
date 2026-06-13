'use client';

import { useId } from 'react';

// ============================================================
// BỘ BIỂU ĐỒ NHẸ - thuần SVG/CSS, không cần thư viện ngoài
// Tự động hỗ trợ Dark mode qua biến currentColor / class
// ============================================================

export interface ChartPoint {
  label: string;
  value: number;
}

/* ---------------- BAR CHART (cột dọc) ---------------- */
export function BarChart({
  data,
  height = 220,
  formatValue,
  barClassName = 'fill-red-500',
}: {
  data: ChartPoint[];
  height?: number;
  formatValue?: (v: number) => string;
  barClassName?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="w-full">
      <div className="flex items-end justify-between gap-2" style={{ height }}>
        {data.map((d, i) => {
          const h = (d.value / max) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group">
              <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {formatValue ? formatValue(d.value) : d.value}
              </div>
              <div
                className={`w-full max-w-[42px] rounded-t-lg transition-all hover:opacity-80 ${barClassName.replace('fill-', 'bg-')}`}
                style={{ height: `${h}%`, minHeight: d.value > 0 ? 4 : 0 }}
                title={`${d.label}: ${formatValue ? formatValue(d.value) : d.value}`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between gap-2 mt-2">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-xs text-slate-400 dark:text-slate-500 font-medium truncate">
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- LINE / AREA CHART ---------------- */
export function LineChart({
  data,
  height = 220,
  formatValue,
  stroke = '#dc2626',
}: {
  data: ChartPoint[];
  height?: number;
  formatValue?: (v: number) => string;
  stroke?: string;
}) {
  const gradId = useId();
  const max = Math.max(...data.map((d) => d.value), 1);
  const W = 600;
  const H = height;
  const pad = 10;
  const stepX = data.length > 1 ? (W - pad * 2) / (data.length - 1) : 0;

  const points = data.map((d, i) => {
    const x = pad + i * stepX;
    const y = H - pad - (d.value / max) * (H - pad * 2);
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? pad} ${H - pad} L ${pad} ${H - pad} Z`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path d={linePath} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={stroke}>
            <title>{`${p.label}: ${formatValue ? formatValue(p.value) : p.value}`}</title>
          </circle>
        ))}
      </svg>
      <div className="flex justify-between gap-1 mt-2">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-xs text-slate-400 dark:text-slate-500 font-medium truncate">
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- DONUT CHART ---------------- */
export interface DonutSlice {
  label: string;
  value: number;
  color: string; // mã hex
}

export function DonutChart({
  data,
  size = 180,
  thickness = 26,
  centerLabel,
  centerValue,
}: {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const radius = (size - thickness) / 2;
  const circ = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={thickness} className="stroke-slate-100 dark:stroke-slate-800" />
          {total > 0 && data.map((d, i) => {
            const len = (d.value / total) * circ;
            const seg = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={d.color}
                strokeWidth={thickness}
                strokeDasharray={`${len} ${circ - len}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              >
                <title>{`${d.label}: ${d.value}`}</title>
              </circle>
            );
            offset += len;
            return seg;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-foreground">{centerValue ?? total}</span>
          {centerLabel && <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">{centerLabel}</span>}
        </div>
      </div>
      <div className="space-y-2 w-full">
        {data.map((d, i) => (
          <div key={i} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-slate-600 dark:text-slate-300">{d.label}</span>
            </div>
            <span className="font-bold text-foreground">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
