import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartColor, formatPHP, formatPHPCompact } from "./chartUtils";

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      <p className="flex items-center justify-between gap-6 text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: chartColor(1) }} />
          Net payout
        </span>
        <span className="font-medium tabular-nums text-foreground">{formatPHP(row.netPay)}</span>
      </p>
      <p className="mt-0.5 flex items-center justify-between gap-6 text-muted-foreground">
        <span>Deductions</span>
        <span className="tabular-nums">{formatPHP(row.deductions)}</span>
      </p>
    </div>
  );
}

export default function PayoutTrendChart({ data = [], height = 260 }) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="payoutFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColor(1)} stopOpacity={0.25} />
              <stop offset="100%" stopColor={chartColor(1)} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            dy={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={64}
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={formatPHPCompact}
          />
          <Tooltip content={<TrendTooltip />} cursor={{ stroke: "hsl(var(--border))" }} />
          <Area
            type="monotone"
            dataKey="netPay"
            stroke={chartColor(1)}
            strokeWidth={2}
            fill="url(#payoutFill)"
            dot={data.length < 3 ? { r: 4, fill: chartColor(1), strokeWidth: 0 } : false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--card))" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Tiny line for the hero stat card. */
export function PayoutSparkline({ data = [] }) {
  if (data.length < 2) return null;
  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <defs>
            <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity={0.35} />
              <stop offset="100%" stopColor="white" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="netPay" stroke="rgba(255,255,255,0.9)" strokeWidth={1.5} fill="url(#sparkFill)" dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
