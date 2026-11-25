import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { chartColor, formatPHP } from "./chartUtils";

export default function PayBreakdownChart({ month }) {
  const segments = [
    { name: "Basic pay", value: month?.basic || 0, color: chartColor(1) },
    { name: "Additions", value: Math.max(0, month?.additions || 0), color: chartColor(3) },
    { name: "Deductions", value: month?.deductions || 0, color: chartColor(4) },
  ];
  const total = segments.reduce((s, x) => s + x.value, 0);

  if (total === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">No pay recorded for this month yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative h-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={segments}
              dataKey="value"
              nameKey="name"
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={2}
              stroke="none"
            >
              {segments.map((s) => (
                <Cell key={s.name} fill={s.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v, n) => [formatPHP(v), n]}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid hsl(var(--border))",
                fontSize: 12,
                boxShadow: "0 8px 24px rgb(0 0 0 / 0.08)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted-foreground">Net pay</span>
          <span className="text-base font-semibold tabular-nums">
            {formatPHP(month?.netPay, { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>
      <ul className="space-y-2">
        {segments.map((s) => (
          <li key={s.name} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
              {s.name}
            </span>
            <span className="font-medium tabular-nums">{formatPHP(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
