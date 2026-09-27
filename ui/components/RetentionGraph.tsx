"use client";

import { useMemo } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type RetentionPoint = { second: number; retention: number };

export default function RetentionGraph({ data }: { data?: RetentionPoint[] }) {
  const chartData = useMemo(() => {
    if (!data || !data.length) {
      return [
        { second: 0, retention: 100 },
        { second: 3, retention: 85 },
        { second: 6, retention: 75 },
        { second: 12, retention: 60 },
        { second: 18, retention: 50 },
        { second: 24, retention: 42 },
        { second: 30, retention: 35 },
      ];
    }
    return data;
  }, [data]);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="second"
            tickFormatter={(v) => `${v}s`}
            stroke="#94a3b8"
            tick={{ fill: "#94a3b8", fontSize: 12 }}
          />
          <YAxis
            domain={[0, 100]}
            stroke="#94a3b8"
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            formatter={(value: number) => [`${Math.round(value)}%`, "Predicted Retention"]}
            labelFormatter={(v) => `Second ${v}`}
            contentStyle={{
              backgroundColor: "#020617",
              borderColor: "#1e293b",
              borderRadius: "0.75rem",
              color: "#f8fafc",
              fontSize: "0.75rem",
            }}
          />
          <Line
            type="monotone"
            dataKey="retention"
            stroke="#22c55e"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#22c55e", strokeWidth: 1 }}
            activeDot={{ r: 5, fill: "#4ade80" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
