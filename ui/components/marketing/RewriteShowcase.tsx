import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";

export function RewriteShowcase() {
  const rewriteStyles = [
    {
      title: "1. Curiosity Hook",
      description:
        "Opens with high-contrast tension or counter-intuitive friction. Forces viewers to watch until the payoff.",
      bestFor: "Best for educational and informational shorts",
      example: "“45 minutes of cardio is the slowest way to lose body fat. Here is what happens to your metabolism instead.”",
    },
    {
      title: "2. Fast-Paced Retention",
      description:
        "Cuts fluff words, optimizes syllables-per-second, and uses staccato rhythm to prevent cognitive drift.",
      bestFor: "Best for tutorials, hacks, and workflow demos",
      example: "“Stop answering emails manually. Link your inbox, set 2 triage rules, and clear 50 emails in 30 seconds.”",
    },
    {
      title: "3. Emotional Storytelling",
      description:
        "Builds immediate personal connection through relatable struggle, high stakes, and vulnerability.",
      bestFor: "Best for personal brand, case studies, and storytelling",
      example: "“I wasted $4,000 letting cash sit in a standard checking account before I learned how high-yield accounts work.”",
    },
  ];

  return (
    <section className="py-12 sm:py-16 px-4 sm:px-6 border-t border-slate-900 bg-slate-950">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-2.5 max-w-2xl mx-auto">
          <Badge variant="emerald" size="md">
            Retention Rewrites
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            Three ready-to-film rewrite angles
          </h2>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Every analysis delivers 3 tailored versions of your script so you can pick the voice and delivery style that fits your content strategy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {rewriteStyles.map((item, idx) => (
            <Card key={idx} variant="default" className="p-5 space-y-3.5 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm sm:text-base">{item.title}</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 italic">
                  {item.example}
                </div>
              </div>
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[11px] font-medium text-indigo-300">{item.bestFor}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
