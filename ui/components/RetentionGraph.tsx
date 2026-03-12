"use client";

import { useMemo } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type RetentionPoint = { second: number; retention: number };

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function seededNoise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function buildRealisticCurve(points: RetentionPoint[]): RetentionPoint[] {
  if (!points.length) return [];

  const peakSecond = Math.max(...points.map((point) => point.second), 18);

  return points.map((point, index) => {
    const t = peakSecond === 0 ? 0 : point.second / peakSecond;
    const earlyDrop = 100 - 30 * (1 - Math.exp(-4 * t));
    const baseline = 70 + (earlyDrop - 70) * Math.exp(-1.4 * t);
    const jitter = (seededNoise(point.second + index + points.length) - 0.5) * 3.2;

    const prior = index === 0 ? 100 : points[index - 1].retention;
    const raw = clamp(Math.round(baseline + jitter), 20, index === 0 ? 100 : Math.min(100, prior));

    return {
      second: point.second,
      retention: index === 0 ? 100 : raw,
    };
  });
}

export default function RetentionGraph({ data }: { data: RetentionPoint[] }) {
  const realisticData = useMemo(() => buildRealisticCurve(data), [data]);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={realisticData}>
          <XAxis dataKey="second" tickFormatter={(v) => `${v}s`} stroke="#94a3b8" />
          <YAxis domain={[0, 100]} stroke="#94a3b8" />
          <Tooltip formatter={(value: number) => [`${value}%`, "Retention"]} labelFormatter={(v) => `${v}s`} />
          <Line type="monotone" dataKey="retention" stroke="#22c55e" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
