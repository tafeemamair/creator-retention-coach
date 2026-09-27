import { analyzeRetention } from "./analyzeRetention";

console.log("🚀 Starting retention analysis...");

(async () => {
  const result = await analyzeRetention({
    video_type: "short",
    platform: "youtube",
    duration: "45 seconds",
    title: "Why your brain loves hard things",
    script:
      "Most people think motivation comes first. It doesn’t. The real reason people succeed is discomfort.",
  });

  console.log("\n📊 RESULT:\n");
  console.log(result);
})();
