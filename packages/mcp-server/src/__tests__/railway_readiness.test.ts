import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { createStreamableHttpServer } from "../http";

describe("CRC Phase 4E: Railway Deployment Readiness & Runtime Verification", () => {
  const TEST_PORT = 8965;
  const TEST_HOST = "127.0.0.1";
  const TEST_CHALLENGE = "crc_railway_verification_token_xyz123";
  const TEST_RESOURCE = "https://mcp.creatorretentioncoach.in";

  // Set environment variables simulating Railway production environment
  process.env.PORT = String(TEST_PORT);
  process.env.HOST = TEST_HOST;
  process.env.NODE_ENV = "production";
  process.env.MCP_RESOURCE_URL = TEST_RESOURCE;
  process.env.MCP_AUDIENCE = TEST_RESOURCE;
  process.env.OPENAI_APPS_CHALLENGE_TOKEN = TEST_CHALLENGE;
  process.env.SUPABASE_AUTH_ISSUER = "https://test-auth.supabase.co/auth/v1";

  let serverInstance: any;

  before(async () => {
    serverInstance = createStreamableHttpServer({
      port: TEST_PORT,
      host: TEST_HOST,
    });
    await serverInstance.start();
  });

  after(async () => {
    if (serverInstance) {
      await serverInstance.stop();
    }
  });

  it("1. Server starts and binds cleanly using environment-configured PORT and HOST", async () => {
    // Verify GET /health
    const healthRes = await fetch(`http://${TEST_HOST}:${TEST_PORT}/health`);
    assert.equal(healthRes.status, 200);
    const healthData = (await healthRes.json()) as any;
    assert.equal(healthData.status, "ok");
    assert.equal(healthData.service, "creator-retention-coach-mcp");
    assert.equal(healthData.transport, "streamable-http");
    assert.equal(healthData.tools.length, 6);

    // Verify GET /
    const rootRes = await fetch(`http://${TEST_HOST}:${TEST_PORT}/`);
    assert.equal(rootRes.status, 200);
    const rootData = (await rootRes.json()) as any;
    assert.equal(rootData.status, "ok");
  });

  it("2. GET /.well-known/oauth-protected-resource serves RFC 9728 discovery data", async () => {
    const res = await fetch(`http://${TEST_HOST}:${TEST_PORT}/.well-known/oauth-protected-resource`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "application/json");

    const data = (await res.json()) as any;
    assert.equal(data.resource, TEST_RESOURCE);
    assert.deepEqual(data.authorization_servers, ["https://test-auth.supabase.co/auth/v1"]);
    assert.deepEqual(data.scopes_supported, ["retention:analyze", "user:credits"]);
    assert.deepEqual(data.bearer_methods_supported, ["header"]);
  });

  it("3. GET /.well-known/openai-apps-challenge serves exact challenge token in plaintext", async () => {
    const res = await fetch(`http://${TEST_HOST}:${TEST_PORT}/.well-known/openai-apps-challenge`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "text/plain");

    const tokenText = await res.text();
    assert.equal(tokenText, TEST_CHALLENGE);
  });

  it("4. POST /mcp handles JSON-RPC tools/list and returns all 6 declared tools", async () => {
    const res = await fetch(`http://${TEST_HOST}:${TEST_PORT}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "test-rpc-1",
        method: "tools/list",
      }),
    });

    assert.equal(res.status, 200);
    const json = (await res.json()) as any;
    assert.equal(json.jsonrpc, "2.0");
    assert.equal(json.id, "test-rpc-1");
    assert.ok(Array.isArray(json.result.tools));
    assert.equal(json.result.tools.length, 6);

    const toolNames = json.result.tools.map((t: any) => t.name);
    assert.ok(toolNames.includes("preview_script_retention"));
    assert.ok(toolNames.includes("analyze_script_retention"));
    assert.ok(toolNames.includes("generate_viral_hooks"));
    assert.ok(toolNames.includes("improve_script_cta"));
    assert.ok(toolNames.includes("get_creator_action_plan"));
    assert.ok(toolNames.includes("check_user_credits"));
  });

  it("5. POST /mcp executes preview_script_retention tool end-to-end without auth", async () => {
    const sampleScript = `Stop wasting time editing videos that nobody watches past second 3.
Here is the exact retention framework used by the top 1% of creators.
First, eliminate your introductory fluff and state the core promise in the first 2 seconds.
Next, vary your sentence pacing every 4 to 6 seconds so viewer attention never resets to zero.
Finally, deliver on your payoff before asking anyone to like or subscribe.
Follow for daily creator retention breakdowns.`;

    const res = await fetch(`http://${TEST_HOST}:${TEST_PORT}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "test-rpc-preview",
        method: "tools/call",
        params: {
          name: "preview_script_retention",
          arguments: {
            script: sampleScript,
            platform: "youtube_shorts",
          },
        },
      }),
    });

    assert.equal(res.status, 200);
    const json = (await res.json()) as any;
    assert.equal(json.id, "test-rpc-preview");
    assert.ok(json.result.content);
    assert.equal(json.result.content[0].type, "text");

    const parsedResult = JSON.parse(json.result.content[0].text);
    assert.equal(parsedResult.valid, true);
    assert.ok(typeof parsedResult.previewScore === "number");
    assert.ok(parsedResult.metrics);
  });
});
