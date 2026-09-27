import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";

export function RiskShowcase() {
  const sampleRisks = [
    {
      line: "Hey guys, welcome back to another video!",
      risk: "High" as const,
      reason: "Greetings waste the golden 0–3 second window where algorithmic swipe decisions are made.",
      fix: "Cut the intro entirely. Open with the tension: 'You are losing 30% of your gains on this one exercise.'",
    },
    {
      line: "In today's video I want to quickly explain how this works.",
      risk: "High" as const,
      reason: "Meta-announcements tell viewers what you plan to do rather than delivering value.",
      fix: "Jump straight to the mechanism: 'Here is why your traditional bank account costs you money.'",
    },
    {
      line: "Make sure to subscribe, like, and share with your friends!",
      risk: "Medium" as const,
      reason: "Generic triple CTAs trigger ad fatigue and accelerate the final drop-off.",
      fix: "Use a single focused trigger: 'Save this reel so you remember to switch accounts this weekend.'",
    },
  ];

  return (
    <section className="py-12 sm:py-16 px-4 sm:px-6 border-t border-slate-900 bg-slate-950/70">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-2.5 max-w-2xl mx-auto">
          <Badge variant="rose" size="md">
            Line-by-Line Risk Diagnostics
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            Know which sentences cause viewers to scroll away
          </h2>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            CRC scans every sentence to flag low-momentum phrasing, channel intros, filler bridges, and weak CTAs before you start filming.
          </p>
        </div>

        <div className="space-y-4">
          {sampleRisks.map((item, idx) => (
            <Card key={idx} variant="default" className="p-5 space-y-3 border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-rose-300 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded">
                  {item.risk} Retention Risk
                </span>
                <span className="text-xs text-slate-500 font-medium">Diagnostic Rule #{idx + 1}</span>
              </div>

              <div className="text-xs sm:text-sm font-semibold text-slate-200 border-l-2 border-rose-500/50 pl-3">
                &ldquo;{item.line}&rdquo;
              </div>

              <div className="grid sm:grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-800/60">
                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <span className="text-rose-400">✕</span> Why Viewers Swipe Away:
                  </span>
                  <p className="text-slate-300 leading-relaxed">{item.reason}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                    <span>✓</span> Retention-Engineered Fix:
                  </span>
                  <p className="text-slate-300 leading-relaxed">{item.fix}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
