import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";

export function SignalGrid() {
  const signals = [
    {
      name: "01. Hook Strength",
      weight: "30% Weight",
      description:
        "Evaluates the first 2–3 seconds for curiosity triggers, pattern interrupts, and friction. Stops the instant swipe away.",
      badge: "Crucial 0–3s",
      badgeColor: "indigo" as const,
    },
    {
      name: "02. Pacing Rhythm",
      weight: "25% Weight",
      description:
        "Analyzes words-per-second, spoken momentum, and eliminates conversational filler words that cause mid-video drift.",
      badge: "Momentum",
      badgeColor: "emerald" as const,
    },
    {
      name: "03. Emotional Stakes",
      weight: "20% Weight",
      description:
        "Measures psychological tension, relatability, and contrast between the problem and the payoff.",
      badge: "Engagement",
      badgeColor: "amber" as const,
    },
    {
      name: "04. Value Delivery",
      weight: "15% Weight",
      description:
        "Checks that the core lesson, hack, or reveal arrives quickly before viewer patience expires.",
      badge: "Payoff",
      badgeColor: "indigo" as const,
    },
    {
      name: "05. Call to Action",
      weight: "10% Weight",
      description:
        "Optimizes the ending for natural shares, saves, or comments without sounding like a desperate pitch.",
      badge: "Conversion",
      badgeColor: "neutral" as const,
    },
  ];

  return (
    <section id="signals" className="py-12 sm:py-16 px-4 sm:px-6 border-t border-slate-900 bg-slate-950">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-2.5 max-w-2xl mx-auto">
          <Badge variant="indigo" size="md">
            Algorithmic Diagnostic Engine
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            The Five Retention Signals
          </h2>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Every short-form script is evaluated across the 5 fundamental structural variables that determine watch time on YouTube Shorts, TikTok, and Instagram Reels.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {signals.map((sig, i) => (
            <Card
              key={sig.name}
              variant="default"
              className={`p-5 space-y-3 ${i === 0 ? "md:col-span-2 lg:col-span-1 border-indigo-500/30" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{sig.name}</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-semibold">
                  {sig.weight}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                {sig.description}
              </p>
              <div className="pt-2">
                <Badge variant={sig.badgeColor} size="sm">
                  {sig.badge}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
