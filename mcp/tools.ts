import { analyzeRetentionFree } from "./retention.ts";

export const tools = [
  {
    name: "analyze_retention",
    description:
      "Predict where viewers are most likely to drop off in a video script.",
    execute: async ({ script }: { script: string }) => {
      return analyzeRetentionFree({ script });
    }
  }
];
