export * from "./server";
export * from "./http";
export * from "./auth/types";
export * from "./auth/adapter";
export * from "./ledger/adapter";
export * from "./tools/previewScriptRetention";
export * from "./tools/analyzeScriptRetention";
export * from "./tools/generateViralHooks";
export * from "./tools/improveScriptCta";
export * from "./tools/getCreatorActionPlan";
export * from "./tools/checkUserCredits";

// CLI execution if executed directly as entrypoint
const isDirectCli = Boolean(
  !process.argv[1]?.includes(".test.") &&
  ((typeof require !== "undefined" && require.main === module) ||
   (process.argv[1] && (
     process.argv[1].endsWith("index.ts") ||
     process.argv[1].endsWith("index.js")
   )))
);

if (isDirectCli) {
  (async () => {
    const { createStreamableHttpServer } = await import("./http");
    const server = createStreamableHttpServer();
    await server.start();
  })().catch(console.error);
}
