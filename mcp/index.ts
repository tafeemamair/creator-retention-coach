import { tools } from "./tools.ts";

process.stdin.setEncoding("utf-8");

process.stdin.on("data", async (data) => {
  try {
    const message = JSON.parse(String(data));

    if (message.tool === "analyze_retention") {
      const tool = tools.find(t => t.name === "analyze_retention");
      if (!tool) {
        throw new Error("Tool not found");
      }

      const result = await tool.execute(message.input);
      process.stdout.write(JSON.stringify({ result }));
    }
  } catch (err: any) {
    process.stdout.write(
      JSON.stringify({ error: err.message || "Unknown error" })
    );
  }
});
