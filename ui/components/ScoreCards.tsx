"use client";

import { useMemo } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const COLORS = ["#22c55e", "#334155"];

type Metrics = { hook: number; pacing: number; emotion: number; value: number; cta: number };

export default function ScoreCards({ score, metrics }: { score: number; metrics: Metrics }) {
  const donutData = useMemo(
    () => [
      { name: "Score", value: Math.round(score) },
      { name: "Remaining", value: Math.max(0, 100 - Math.round(score)) },
    ],
    [score],
  );

  const bars = useMemo(
    () => [
      { name: "Hook", score: Math.round(metrics.hook) },
      { name: "Pacing", score: Math.round(metrics.pacing) },
      { name: "Emotion", score: Math.round(metrics.emotion) },
      { name: "Value", score: Math.round(metrics.value) },
      { name: "CTA", score: Math.round(metrics.cta) },
    ],
    [metrics],
  );

  return (
    <>
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
        <p className="text-center text-2xl font-bold">{Math.round(score)} / 100</p>
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
        <p className="mt-2 text-xs text-slate-500">
          Scores are calculated from Hook (30%), Pacing (25%), Emotion (20%), Value Delivery (15%), and Call-to-Action (10%).
        </p>
      </div>
    </>
  );
}
