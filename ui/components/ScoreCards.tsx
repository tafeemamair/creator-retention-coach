"use client";

import { useMemo } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Metrics = { hook: number; pacing: number; emotion: number; value: number; cta: number };

export default function ScoreCards({ score, metrics }: { score: number; metrics: Metrics }) {
  const roundedScore = Math.round(score);

  const getScoreColor = (val: number) => {
    if (val >= 75) return "#10b981"; // emerald
    if (val >= 50) return "#f59e0b"; // amber
    return "#f43f5e"; // rose
  };

  const donutData = useMemo(
    () => [
      { name: "Score", value: roundedScore },
      { name: "Remaining", value: Math.max(0, 100 - roundedScore) },
    ],
    [roundedScore],
  );

  const bars = useMemo(
    () => [
      { name: "Hook", score: Math.round(metrics.hook), weight: "30%" },
      { name: "Pacing", score: Math.round(metrics.pacing), weight: "25%" },
      { name: "Emotion", score: Math.round(metrics.emotion), weight: "20%" },
      { name: "Value", score: Math.round(metrics.value), weight: "15%" },
      { name: "CTA", score: Math.round(metrics.cta), weight: "10%" },
    ],
    [metrics],
  );

  const scoreColor = getScoreColor(roundedScore);

  return (
    <>
      {/* Retention Score Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Overall Retention Score
          </h3>
          <span
            className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border"
            style={{
              color: scoreColor,
              backgroundColor: `${scoreColor}15`,
              borderColor: `${scoreColor}30`,
            }}
          >
            {roundedScore >= 75 ? "Strong Retention" : roundedScore >= 50 ? "Moderate Risk" : "High Drop-off Risk"}
          </span>
        </div>

        <div className="h-44 my-2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={donutData}
                dataKey="value"
                innerRadius={55}
                outerRadius={75}
                startAngle={90}
                endAngle={-270}
              >
                <Cell fill={scoreColor} />
                <Cell fill="#1e293b" />
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#020617",
                  borderColor: "#1e293b",
                  borderRadius: "0.75rem",
                  color: "#f8fafc",
                  fontSize: "0.75rem",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="text-center space-y-0.5">
          <p className="text-3xl font-extrabold text-white font-mono tabular-nums">{roundedScore}<span className="text-sm font-normal text-slate-400">/100</span></p>
          <p className="text-[11px] text-slate-400">Platform-weighted retention benchmark</p>
        </div>
      </div>

      {/* 5-Signal Metric Breakdown Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Five Retention Signals
          </h3>
          <span className="text-xs text-slate-400 font-mono">0–100 Scale</span>
        </div>

        <div className="h-44 my-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#020617",
                  borderColor: "#1e293b",
                  borderRadius: "0.75rem",
                  color: "#f8fafc",
                  fontSize: "0.75rem",
                }}
                formatter={(val: number) => [`${val}/100`, "Score"]}
              />
              <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                {bars.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getScoreColor(entry.score)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <p className="text-[11px] text-slate-400 text-center">
          Hook (30%) • Pacing (25%) • Emotion (20%) • Value (15%) • CTA (10%)
        </p>
      </div>
    </>
  );
}
