import React from 'react';

/* ── Premium SaaS Stat Card Component ─────────────────────────────────── */
export const StatCard = ({ title, value, icon: Icon, iconBg, iconColor, gradientBg }) => (
  <div className="admin-card group relative overflow-hidden">
    <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl opacity-25 group-hover:opacity-50 transition-opacity pointer-events-none ${gradientBg || 'bg-[#22C55E]'}`}></div>
    <div className="flex items-center justify-between mb-4 relative z-10">
      <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">{title}</span>
      <div className="p-3 rounded-[16px] bg-white/4 border border-white/8 transition-transform duration-300 group-hover:scale-110 shadow-sm">
        <Icon className={`w-5 h-5 ${iconColor || 'text-[#22C55E]'}`} />
      </div>
    </div>
    <div className="flex items-baseline justify-between relative z-10">
      <h3 className="text-3xl font-black text-white tracking-tight">{value}</h3>
    </div>
  </div>
);

/* ── Custom SVG Area/Line Chart ───────────────────────────────────────── */
export const CustomAreaChart = ({ data, dataKey, color, title }) => {
  if (!data || data.length === 0) return null;
  const values = data.map(d => d[dataKey]);
  const maxVal = Math.max(...values, 10);
  const minVal = 0;
  
  const width = 500;
  const height = 150;
  const padding = 30;
  
  const points = data.map((d, i) => {
    const x = padding + (i * (width - padding * 2)) / (data.length - 1);
    const y = height - padding - ((d[dataKey] - minVal) * (height - padding * 2)) / (maxVal - minVal);
    return { x, y };
  });

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
    : '';

  return (
    <div className="admin-card space-y-4">
      <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wide">{title}</h3>
      <div className="w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
          <defs>
            <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0.0} />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.5, 1].map((ratio, i) => {
            const y = padding + ratio * (height - padding * 2);
            const val = Math.round(maxVal - ratio * (maxVal - minVal));
            return (
              <g key={i} className="opacity-20">
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255,255,255,0.2)" strokeDasharray="3" />
                <text x={padding - 6} y={y + 3} textAnchor="end" className="text-[8px] fill-[#94A3B8] font-bold">
                  {dataKey === 'revenue' ? `₹${val}` : val}
                </text>
              </g>
            );
          })}

          {/* Area under curve */}
          <path d={areaD} fill={`url(#gradient-${dataKey})`} />

          {/* Line */}
          <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />

          {/* Data Points */}
          {points.map((p, i) => (
            <g key={i} className="group/dot cursor-pointer">
              <circle
                cx={p.x}
                cy={p.y}
                r="3.5"
                fill="#ffffff"
                stroke={color}
                strokeWidth="2.5"
              />
              <title>{data[i].date}: {dataKey === 'revenue' ? `₹${data[i][dataKey]}` : data[i][dataKey]}</title>
            </g>
          ))}

          {/* X Axis Labels */}
          {data.map((d, i) => {
            const x = padding + (i * (width - padding * 2)) / (data.length - 1);
            return (
              <text key={i} x={x} y={height - 5} textAnchor="middle" className="text-[8px] fill-[#94A3B8] font-bold">
                {d.date}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
