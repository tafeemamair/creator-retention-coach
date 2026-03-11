"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function RetentionGraph({ data }: { data: Array<{ second: number; retention: number }> }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="second" tickFormatter={(v) => `${v}s`} stroke="#94a3b8" />
          <YAxis domain={[0, 100]} stroke="#94a3b8" />
          <Tooltip formatter={(value: number) => [`${value}%`, "Retention"]} labelFormatter={(v) => `${v}s`} />
          <Line type="monotone" dataKey="retention" stroke="#22c55e" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
