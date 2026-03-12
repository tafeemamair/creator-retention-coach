"use client";

import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import RetentionGraph from "./RetentionGraph";

const COLORS = ["#22c55e", "#334155"];

export type DashboardData = {
  score: number;
  metrics: { hook: number; pacing: number; emotion: number; value: number; cta: number };
  dropoffPrediction: { second: number; reason: string };
  retentionTimeline: Array<{ second: number; retention: number }>;
};

export default function RetentionDashboard({ data }: { data: DashboardData }) {
  const donutData = [
    { name: "Score", value: data.score },
    { name: "Remaining", value: 100 - data.score },
  ];
  const bars = [
    { name: "Hook", score: data.metrics.hook },
    { name: "Pacing", score: data.metrics.pacing },
    { name: "Emotion", score: data.metrics.emotion },
    { name: "Value", score: data.metrics.value },
    { name: "CTA", score: data.metrics.cta },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <h3 className="mb-2 font-semibold">Retention Score</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={donutData} dataKey="value" innerRadius={60} outerRadius={85}>
                {donutData.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <p className="text-center text-2xl font-bold">{Math.round(data.score)} / 100</p>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <h3 className="mb-2 font-semibold">Metric Breakdown</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars}>
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis domain={[0, 100]} stroke="#94a3b8" />
              <Tooltip />
              <Bar dataKey="score" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm md:col-span-2">
        <h3 className="mb-2 font-semibold">Drop-Off Timeline</h3>
        <RetentionGraph data={data.retentionTimeline} />
        <p className="mt-2 text-sm text-slate-600">
          Predicted drop-off around <span className="font-semibold">{data.dropoffPrediction.second}s</span> — {data.dropoffPrediction.reason}
        </p>
      </div>
    </div>
  );
}
