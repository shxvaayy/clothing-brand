"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function RevenueChart({
  data,
}: {
  data: { date: string; revenue: number; orders: number }[];
}) {
  return (
    <div className="h-64 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a85b44" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#a85b44" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#eadfd2" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#8a7a6e" }}
            tickFormatter={(d: string) => d.slice(5)}
            tickLine={false}
            axisLine={{ stroke: "#eadfd2" }}
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#8a7a6e" }}
            tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{ border: "1px solid #eadfd2", fontSize: 12, background: "#fff" }}
            formatter={(value, name) => [
              name === "revenue" ? `₹${Number(value).toLocaleString("en-IN")}` : value,
              name === "revenue" ? "Revenue" : "Orders",
            ]}
          />
          <Area type="monotone" dataKey="revenue" stroke="#a85b44" strokeWidth={2} fill="url(#rev)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
