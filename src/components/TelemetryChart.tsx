import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { useMemo } from "react";

interface TelemetryChartProps {
  data: number[];
  label: string;
  color: string;
}

export function TelemetryChart({ data, label, color }: TelemetryChartProps) {
  const chartData = useMemo(() => {
    return data.map((val, i) => ({ index: i, value: val }));
  }, [data]);

  return (
    <div className="h-40 w-full group">
      <div className="flex justify-between items-end mb-4 px-1">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 group-hover:text-white/60 transition-colors">{label}</span>
        <span className="text-sm font-mono font-bold text-white transition-all transform group-hover:scale-110">{data[data.length - 1]}</span>
      </div>
      <div className="h-32 w-full">
        <ResponsiveContainer width="100%" height="100%" minHeight={1} minWidth={1}>
          <AreaChart data={chartData}>
          <defs>
            <linearGradient id={`gradient-${label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.4} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={3}
            fillOpacity={1}
            fill={`url(#gradient-${label})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
