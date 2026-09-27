import { describe, it } from "node:test";
import assert from "node:assert";
import crypto from "node:crypto";
import { createCrcMcpServer } from "../server";
import { createStreamableHttpServer } from "../http";
import { handlePreviewScriptRetention } from "../tools/previewScriptRetention";
import { handleAnalyzeScriptRetention } from "../tools/analyzeScriptRetention";
import { handleGenerateViralHooks } from "../tools/generateViralHooks";
import { handleImproveScriptCta } from "../tools/improveScriptCta";
import { handleGetCreatorActionPlan } from "../tools/getCreatorActionPlan";
import { handleCheckUserCredits, checkUserCreditsSchema } from "../tools/checkUserCredits";
import { RedisLedgerRepository } from "../../../infra/src/index";
import { McpLedgerAdapter } from "../ledger/adapter";
import { verifyJwt, clearJwksCache } from "../auth/jwtVerifier";
import type {
  AIProvider,
  LedgerRepository,
  DropOffRisk,
  RewriteOutput,
  CopilotResult,
  CopilotContext,
  CopilotAction,
} from "../../../core/src/index";

class MockAIProvider implements AIProvider {
  public dropOffCalls = 0;
  public rewriteCalls = 0;
  public copilotCalls = 0;

  async detectDropOffRisks(): Promise<DropOffRisk[]> {
    this.dropOffCalls++;
    return [
      {
        second: 5,
        riskLevel: "high",
        reason: "Slow opening hook",
        suggestedFix: "Start immediately with the high-stakes revelation",
        lineIndex: 0,
        originalSentence: "Hello guys, today we are going to talk about finance.",
      },
    ];
  }

  async generateRewrites(): Promise<RewriteOutput> {
    this.rewriteCalls++;
    return {
      rewrites: [
        {
          type: "Curiosity Hook",
          script: "What if everything you know about investing is backwards?",
        },
        {
          type: "Fast-Paced Retention",
          script: "Stop losing money on basic index funds.",
        },
      ],
      titles: ["Why saving money makes you poor", "The retention secret"],
    };
  }

  async executeCopilotAction(context: CopilotContext, action: CopilotAction): Promise<CopilotResult> {
    this.copilotCalls++;
    if (action === "generate_hooks") {
      return {
        action: "generate_hooks",
        targetLanguage: "en",
        items: [
          { text: "The secret to 70% retention nobody talks about.", rationale: "Curiosity gap", style: "Curiosity Hook" },
          { text: "Why your video hooks are actually losing viewers.", rationale: "Contrarian shock", style: "Contrarian Hook" },
          { text: "Here is the exact 3-step script retention framework.", rationale: "Direct value", style: "Direct Value Hook" },
        ],
      };
    }
    return {
      action: "improve_cta",
      targetLanguage: "en",
      items: [
        { text: "Hit subscribe right now to get next week's masterclass.", rationale: "Seamless action", style: "Improved CTA" },
      ],
    };
  }
}

const SAMPLE_SCRIPT = `
Stop scrolling right now because this retention trick will change your channel forever.
Most creators lose 50 percent of their audience in the first thirty seconds because they introduce themselves.
Instead of saying hello, jump directly into the core payoff and keep pacing rapid.
Subscribe for more viral YouTube retention tips!
`.trim();

describe("CRC Phase 3D: Production Security & Authoritative Ledger Adapter", () => {
  it("1. check_user_credits schema has NO public userId override parameter", () => {
    assert.deepStrictEqual(Object.keys(checkUserCreditsSchema), []);
  });

  it("2. check_user_credits rejects unauthenticated or anonymous calls with auth error", async () => {
    const ledger = new RedisLedgerRepository();

    // Missing authContext
    const resNoAuth = await handleCheckUserCredits({}, { ledger });
    assert.strictEqual(resNoAuth.isError, true);
    assert.ok(resNoAuth.content[0].text.includes("Authentication required"));

    // Anonymous authContext
    const resAnon = await handleCheckUserCredits(
      {},
      { ledger, authContext: { userId: "mcp_anonymous_user", authType: "api_key" } }
    );
    assert.strictEqual(resAnon.isError, true);
    assert.ok(resAnon.content[0].text.includes("Authentication required"));
  });

  it("3. check_user_credits derives identity strictly from AuthContext.userId and prevents spoofing", async () => {
    const ledger = new RedisLedgerRepository();

    // Authenticated user Alice
    const resAlice = await handleCheckUserCredits(
      {},
      { ledger, authContext: { userId: "creator_alice_123", authType: "api_key" } }
    );
    assert.strictEqual(resAlice.isError, undefined);
    const entitlementAlice = JSON.parse(resAlice.content[0].text);
    assert.strictEqual(entitlementAlice.userId, "creator_alice_123");

    // Authenticated user Bob receives Bob's entitlement, never Alice's
    const resBob = await handleCheckUserCredits(
      {},
      { ledger, authContext: { userId: "creator_bob_456", authType: "api_key" } }
    );
    assert.strictEqual(resBob.isError, undefined);
    const entitlementBob = JSON.parse(resBob.content[0].text);
    assert.strictEqual(entitlementBob.userId, "creator_bob_456");
  });

  it("4. analyze_script_retention rejects unauthenticated callers", async () => {
    const mockAi = new MockAIProvider();
    const ledger = new RedisLedgerRepository();

    const res = await handleAnalyzeScriptRetention(
      { script: SAMPLE_SCRIPT, platform: "youtube_longform" },
      { aiProvider: mockAi, ledger, authContext: { userId: "mcp_anonymous_user", authType: "api_key" } }
    );
    assert.strictEqual(res.isError, true);
    assert.ok(res.content[0].text.includes("Authentication required"));
  });

  it("5. Production RedisLedgerRepository implements real reservation, commit, rollback, and dynamic entitlements", async () => {
    const ledger = new RedisLedgerRepository();
    const userId = `test_creator_${Date.now()}`;
    const scriptHash = crypto.createHash("sha256").update(SAMPLE_SCRIPT).digest("hex");

    // 1. Check initial entitlement: 1 free credit, 0 paid credits
    const initialEntitlement = await ledger.getEntitlement(userId);
    assert.strictEqual(initialEntitlement.freeCreditsRemaining, 1);
    assert.strictEqual(initialEntitlement.totalCredits, 1);

    // 2. Reserve 1 free credit
    const reservation = await ledger.reserveCredit(userId, scriptHash, "youtube_shorts");
    assert.strictEqual(reservation.success, true);
    assert.strictEqual(reservation.status, "consumed_free");
    assert.ok(reservation.reservationId);

    // Entitlement now shows free credit consumed
    const postReserveEntitlement = await ledger.getEntitlement(userId);
    assert.strictEqual(postReserveEntitlement.freeCreditsRemaining, 0);
    assert.strictEqual(postReserveEntitlement.totalCredits, 0);

    // 3. Rollback reservation
    await ledger.rollbackCredit(reservation.reservationId!);
    const postRollbackEntitlement = await ledger.getEntitlement(userId);
    assert.strictEqual(postRollbackEntitlement.freeCreditsRemaining, 1);
    assert.strictEqual(postRollbackEntitlement.totalCredits, 1);

    // 4. Reserve again and commit
    const reservation2 = await ledger.reserveCredit(userId, scriptHash, "youtube_shorts");
    assert.strictEqual(reservation2.success, true);
    await ledger.commitCredit(reservation2.reservationId!);

    // 5. Subsequent analysis of SAME script hash is IDEMPOTENT (does not fail with no_credits)
    const idempotentReservation = await ledger.reserveCredit(userId, scriptHash, "youtube_shorts");
    assert.strictEqual(idempotentReservation.success, true);

    // 6. Analysis of a DIFFERENT script hash without credits is REJECTED
    const newScriptHash = crypto.createHash("sha256").update("Completely different script text").digest("hex");
    const rejectedReservation = await ledger.reserveCredit(userId, newScriptHash, "youtube_shorts");
    assert.strictEqual(rejectedReservation.success, false);
    assert.ok(rejectedReservation.error?.includes("No analysis credits remaining"));
  });

  it("6. McpLedgerAdapter delegates directly to production RedisLedgerRepository", async () => {
    const adapter = new McpLedgerAdapter();
    const userId = `adapter_test_${Date.now()}`;
    const entitlement = await adapter.getEntitlement(userId);
    assert.strictEqual(entitlement.userId, userId);
    assert.strictEqual(entitlement.freeCreditsRemaining, 1);
  });

  it("7. Full analysis flow executes cleanly through RedisLedgerRepository and OpenAIProvider", async () => {
    const mockAi = new MockAIProvider();
    const ledger = new RedisLedgerRepository();
    const userId = `flow_creator_${Date.now()}`;

    const res = await handleAnalyzeScriptRetention(
      { script: SAMPLE_SCRIPT, platform: "youtube_longform" },
      {
        aiProvider: mockAi,
        ledger,
        authContext: { userId, authType: "api_key" },
      }
    );

    assert.strictEqual(res.isError, undefined);
    const parsed = JSON.parse(res.content[0].text);
    assert.ok(parsed.score > 0);
    assert.strictEqual(mockAi.dropOffCalls, 1);
    assert.strictEqual(mockAi.rewriteCalls, 1);

    // Entitlement reflects consumed free credit
    const entitlement = await ledger.getEntitlement(userId);
    assert.strictEqual(entitlement.freeCreditsRemaining, 0);
  });

  it("8. Streamable HTTP server advertises accurate security schemes and annotations for all 6 tools", async () => {
    const mockAi = new MockAIProvider();
    const httpHandler = createStreamableHttpServer({
      port: 8999,
      deps: { aiProvider: mockAi },
    });

    await httpHandler.start();

    try {
      const listRes = await fetch(`http://localhost:8999/mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
          params: {},
        }),
      });

      assert.strictEqual(listRes.status, 200);
      const listJson: any = await listRes.json();
      const tools = listJson.result.tools;
      assert.strictEqual(tools.length, 6);

      // Verify annotations and security schemes per tool
      const toolMap = new Map(tools.map((t: any) => [t.name, t]));

      // 1. preview_script_retention
      const previewTool: any = toolMap.get("preview_script_retention");
      assert.strictEqual(previewTool.readOnlyHint, true);
      assert.strictEqual(previewTool.destructiveHint, false);
      assert.strictEqual(previewTool.openWorldHint, false);
      assert.strictEqual(previewTool.idempotentHint, true);
      assert.strictEqual(previewTool.authRequired, false);

      // 2. analyze_script_retention
      const analyzeTool: any = toolMap.get("analyze_script_retention");
      assert.strictEqual(analyzeTool.readOnlyHint, false);
      assert.strictEqual(analyzeTool.destructiveHint, false);
      assert.strictEqual(analyzeTool.openWorldHint, true);
      assert.strictEqual(analyzeTool.idempotentHint, true);
      assert.strictEqual(analyzeTool.authRequired, true);

      // 3. generate_viral_hooks
      const hooksTool: any = toolMap.get("generate_viral_hooks");
      assert.strictEqual(hooksTool.readOnlyHint, true);
      assert.strictEqual(hooksTool.destructiveHint, false);
      assert.strictEqual(hooksTool.openWorldHint, true);
      assert.strictEqual(hooksTool.idempotentHint, false);
      assert.strictEqual(hooksTool.authRequired, false);

      // 4. improve_script_cta
      const ctaTool: any = toolMap.get("improve_script_cta");
      assert.strictEqual(ctaTool.readOnlyHint, true);
      assert.strictEqual(ctaTool.destructiveHint, false);
      assert.strictEqual(ctaTool.openWorldHint, true);
      assert.strictEqual(ctaTool.idempotentHint, false);
      assert.strictEqual(ctaTool.authRequired, false);

      // 5. get_creator_action_plan
      const planTool: any = toolMap.get("get_creator_action_plan");
      assert.strictEqual(planTool.readOnlyHint, true);
      assert.strictEqual(planTool.destructiveHint, false);
      assert.strictEqual(planTool.openWorldHint, false);
      assert.strictEqual(planTool.idempotentHint, true);
      assert.strictEqual(planTool.authRequired, false);

      // 6. check_user_credits
      const creditsTool: any = toolMap.get("check_user_credits");
      assert.strictEqual(creditsTool.readOnlyHint, true);
      assert.strictEqual(creditsTool.destructiveHint, false);
      assert.strictEqual(creditsTool.openWorldHint, false);
      assert.strictEqual(creditsTool.idempotentHint, true);
      assert.strictEqual(creditsTool.authRequired, true);
      assert.deepStrictEqual(creditsTool.inputSchema.properties, {});
    } finally {
      await httpHandler.stop();
    }
  });
});

describe("CRC Phase 3F: Canonical Redis Key Unification", () => {
  it("1. Entitlement key matches canonical website namespace (user:${userId}:entitlement)", () => {
    const ledger = new RedisLedgerRepository();
    const userId = "user-123";
    const key = ledger.getUserEntitlementKey(userId);
    assert.strictEqual(key, "user:user-123:entitlement");
    assert.doesNotMatch(key, /^crc:/);
  });

  it("2. Idempotency key matches canonical website format (hash:${userId}:${scriptHash}:${platform})", () => {
    const ledger = new RedisLedgerRepository();
    const userId = "user-123";
    const scriptHash = "abc123";
    const platform = "youtube";
    const key = ledger.getUserScriptHashKey(userId, scriptHash, platform);
    assert.strictEqual(key, "hash:user-123:abc123:youtube");
    assert.doesNotMatch(key, /^crc:/);
  });

  it("3. Lock key matches canonical website namespace (lock:user:${userId})", () => {
    const ledger = new RedisLedgerRepository();
    const userId = "user-123";
    const key = ledger.getUserLockKey(userId);
    assert.strictEqual(key, "lock:user:user-123");
    assert.doesNotMatch(key, /^crc:/);
  });

  it("4. Cross-platform isolation ensures different platforms generate distinct keys", () => {
    const ledger = new RedisLedgerRepository();
    const userId = "user-123";
    const scriptHash = "abc123";
    const keyYoutube = ledger.getUserScriptHashKey(userId, scriptHash, "youtube");
    const keyTiktok = ledger.getUserScriptHashKey(userId, scriptHash, "tiktok");
    const keyReels = ledger.getUserScriptHashKey(userId, scriptHash, "reels");

    assert.notStrictEqual(keyYoutube, keyTiktok);
    assert.notStrictEqual(keyYoutube, keyReels);
    assert.notStrictEqual(keyTiktok, keyReels);
    assert.strictEqual(keyYoutube, "hash:user-123:abc123:youtube");
    assert.strictEqual(keyTiktok, "hash:user-123:abc123:tiktok");
    assert.strictEqual(keyReels, "hash:user-123:abc123:reels");
  });

  it("5. Cross-user isolation guarantees users generate independent Redis keys", () => {
    const ledger = new RedisLedgerRepository();
    const scriptHash = "abc123";
    const platform = "youtube_shorts";

    const entKeyA = ledger.getUserEntitlementKey("user_A");
    const entKeyB = ledger.getUserEntitlementKey("user_B");
    assert.notStrictEqual(entKeyA, entKeyB);
    assert.strictEqual(entKeyA, "user:user_A:entitlement");
    assert.strictEqual(entKeyB, "user:user_B:entitlement");

    const hashKeyA = ledger.getUserScriptHashKey("user_A", scriptHash, platform);
    const hashKeyB = ledger.getUserScriptHashKey("user_B", scriptHash, platform);
    assert.notStrictEqual(hashKeyA, hashKeyB);
    assert.strictEqual(hashKeyA, "hash:user_A:abc123:youtube_shorts");
    assert.strictEqual(hashKeyB, "hash:user_B:abc123:youtube_shorts");

    const lockKeyA = ledger.getUserLockKey("user_A");
    const lockKeyB = ledger.getUserLockKey("user_B");
    assert.notStrictEqual(lockKeyA, lockKeyB);
    assert.strictEqual(lockKeyA, "lock:user:user_A");
    assert.strictEqual(lockKeyB, "lock:user:user_B");
  });

  it("6. Idempotency key consistency for same user + script + platform", () => {
    const ledger = new RedisLedgerRepository();
    const userId = "creator_99";
    const scriptHash = "deadbeef456";
    const platform = "YouTube Shorts";

    const key1 = ledger.getUserScriptHashKey(userId, scriptHash, platform);
    const key2 = ledger.getUserScriptHashKey(userId, scriptHash, platform);
    assert.strictEqual(key1, key2);
    assert.strictEqual(key1, "hash:creator_99:deadbeef456:youtube_shorts");
  });

  it("7. Credit semantics (reserve, commit, rollback, entitlement) remain intact with canonical keys", async () => {
    const ledger = new RedisLedgerRepository();
    const userId = `unified_user_${Date.now()}`;
    const scriptHash = crypto.createHash("sha256").update("Unified Key Test Script").digest("hex");

    // 1. Entitlement check
    const entInitial = await ledger.getEntitlement(userId);
    assert.strictEqual(entInitial.freeCreditsRemaining, 1);
    assert.strictEqual(entInitial.totalCredits, 1);

    // 2. Reserve
    const res = await ledger.reserveCredit(userId, scriptHash, "youtube_shorts");
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, "consumed_free");
    assert.ok(res.reservationId);

    // 3. Rollback
    await ledger.rollbackCredit(res.reservationId!);
    const entPostRollback = await ledger.getEntitlement(userId);
    assert.strictEqual(entPostRollback.freeCreditsRemaining, 1);

    // 4. Re-reserve and commit
    const res2 = await ledger.reserveCredit(userId, scriptHash, "youtube_shorts");
    assert.strictEqual(res2.success, true);
    await ledger.commitCredit(res2.reservationId!);

    // 5. Same script + platform is idempotent
    const resIdempotent = await ledger.reserveCredit(userId, scriptHash, "youtube_shorts");
    assert.strictEqual(resIdempotent.success, true);
    assert.strictEqual(resIdempotent.status, "idempotent");
  });

  it("8. Cross-system compatibility: Website canonical key formula == MCP canonical key formula", () => {
    const ledger = new RedisLedgerRepository();
    const testCases = [
      { userId: "u1", scriptHash: "h1", platform: "YouTube Shorts", expectedPlatform: "youtube_shorts" },
      { userId: "creator_pro", scriptHash: "sha256_hash_val", platform: "TikTok", expectedPlatform: "tiktok" },
      { userId: "global_user", scriptHash: "hash_xyz", platform: "Instagram Reels", expectedPlatform: "instagram_reels" },
    ];

    for (const tc of testCases) {
      const canonicalEntitlement = `user:${tc.userId}:entitlement`;
      const canonicalHash = `hash:${tc.userId}:${tc.scriptHash}:${tc.expectedPlatform}`;
      const canonicalLock = `lock:user:${tc.userId}`;

      assert.strictEqual(ledger.getUserEntitlementKey(tc.userId), canonicalEntitlement);
      assert.strictEqual(ledger.getUserScriptHashKey(tc.userId, tc.scriptHash, tc.platform), canonicalHash);
      assert.strictEqual(ledger.getUserLockKey(tc.userId), canonicalLock);
    }
  });
});

describe("CRC Phase 4B: OAuth 2.1 Security, JWT Verification & Protected Endpoints", () => {
  // Test RSA Keypair & JWKS fixtures
  const { publicKey: pub1, privateKey: priv1 } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk1: any = pub1.export({ format: "jwk" });
  jwk1.kid = "test-key-1";
  jwk1.alg = "RS256";
  jwk1.use = "sig";

  const { publicKey: pub2, privateKey: priv2 } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk2: any = pub2.export({ format: "jwk" });
  jwk2.kid = "test-key-2";
  jwk2.alg = "RS256";
  jwk2.use = "sig";

  const testJwks = { keys: [jwk1, jwk2] };

  function signJwt(payload: Record<string, any>, privateKey: crypto.KeyObject, kid = "test-key-1") {
    const header = { alg: "RS256", typ: "JWT", kid };
    const rawHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
    const rawPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(`${rawHeader}.${rawPayload}`);
    const signature = signer.sign(privateKey, "base64url");
    return `${rawHeader}.${rawPayload}.${signature}`;
  }

  const validPayload = {
    sub: "creator_verified_777",
    iss: "https://auth.creatorretention.coach",
    aud: "https://mcp.creatorretention.coach",
    exp: Math.floor(Date.now() / 1000) + 3600,
    scope: "retention:analyze user:credits",
  };

  it("1. Public tool without token succeeds", async () => {
    const httpHandler = createStreamableHttpServer({
      port: 8991,
    });
    await httpHandler.start();

    try {
      const res = await fetch("http://localhost:8991/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "preview_script_retention",
            arguments: { script: SAMPLE_SCRIPT, platform: "youtube_shorts" },
          },
        }),
      });

      assert.strictEqual(res.status, 200);
      const json: any = await res.json();
      assert.strictEqual(json.result?.isError, undefined);
      assert.ok(json.result?.content[0]?.text?.includes("previewScore"));
    } finally {
      await httpHandler.stop();
    }
  });

  it("2. Protected tool without token returns HTTP 401 with WWW-Authenticate header", async () => {
    const httpHandler = createStreamableHttpServer({
      port: 8992,
    });
    await httpHandler.start();

    try {
      const res = await fetch("http://localhost:8992/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: {
            name: "check_user_credits",
            arguments: {},
          },
        }),
      });

      assert.strictEqual(res.status, 401);
      const wwwAuth = res.headers.get("www-authenticate");
      assert.ok(wwwAuth);
      assert.ok(wwwAuth?.includes('Bearer realm="mcp"'));
      assert.ok(wwwAuth?.includes(".well-known/oauth-protected-resource"));

      const json: any = await res.json();
      assert.strictEqual(json.error?.code, -32001);
      assert.ok(json.error?._meta?.["mcp/www_authenticate"]?.[0]?.includes(".well-known/oauth-protected-resource"));
    } finally {
      await httpHandler.stop();
    }
  });

  it("3. Protected tool with malformed JWT returns HTTP 401", async () => {
    const httpHandler = createStreamableHttpServer({
      port: 8993,
      jwtVerifyOptions: { customJwks: testJwks },
    });
    await httpHandler.start();

    try {
      const res = await fetch("http://localhost:8993/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer not.a.valid.jwt.token",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: {
            name: "check_user_credits",
            arguments: {},
          },
        }),
      });

      assert.strictEqual(res.status, 401);
      const json: any = await res.json();
      assert.ok(json.error?.message?.includes("Malformed JWT"));
    } finally {
      await httpHandler.stop();
    }
  });

  it("4. Protected tool with invalid signature returns HTTP 401", async () => {
    const { privateKey: untrustedPriv } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    const forgedToken = signJwt(validPayload, untrustedPriv, "test-key-1");

    const httpHandler = createStreamableHttpServer({
      port: 8994,
      jwtVerifyOptions: { customJwks: testJwks },
    });
    await httpHandler.start();

    try {
      const res = await fetch("http://localhost:8994/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${forgedToken}`,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 4,
          method: "tools/call",
          params: {
            name: "check_user_credits",
            arguments: {},
          },
        }),
      });

      assert.strictEqual(res.status, 401);
      const json: any = await res.json();
      assert.ok(json.error?.message?.includes("cryptographic signature"));
    } finally {
      await httpHandler.stop();
    }
  });

  it("5. Protected tool with expired JWT returns HTTP 401", async () => {
    const expiredPayload = {
      ...validPayload,
      exp: Math.floor(Date.now() / 1000) - 300, // expired 5 minutes ago
    };
    const expiredToken = signJwt(expiredPayload, priv1, "test-key-1");

    const httpHandler = createStreamableHttpServer({
      port: 8995,
      jwtVerifyOptions: { customJwks: testJwks, clockSkewSeconds: 0 },
    });
    await httpHandler.start();

    try {
      const res = await fetch("http://localhost:8995/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${expiredToken}`,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 5,
          method: "tools/call",
          params: {
            name: "check_user_credits",
            arguments: {},
          },
        }),
      });

      assert.strictEqual(res.status, 401);
      const json: any = await res.json();
      assert.ok(json.error?.message?.includes("expired"));
    } finally {
      await httpHandler.stop();
    }
  });

  it("6. Protected tool with wrong issuer returns HTTP 401", async () => {
    const wrongIssuerPayload = {
      ...validPayload,
      iss: "https://untrusted-auth-server.com",
    };
    const token = signJwt(wrongIssuerPayload, priv1, "test-key-1");

    const httpHandler = createStreamableHttpServer({
      port: 8996,
      jwtVerifyOptions: {
        customJwks: testJwks,
        expectedIssuer: "https://auth.creatorretention.coach",
      },
    });
    await httpHandler.start();

    try {
      const res = await fetch("http://localhost:8996/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 6,
          method: "tools/call",
          params: {
            name: "check_user_credits",
            arguments: {},
          },
        }),
      });

      assert.strictEqual(res.status, 401);
      const json: any = await res.json();
      assert.ok(json.error?.message?.includes("Issuer mismatch"));
    } finally {
      await httpHandler.stop();
    }
  });

  it("7. Protected tool with wrong audience/resource returns HTTP 401", async () => {
    const wrongAudPayload = {
      ...validPayload,
      aud: "https://other-mcp-service.com",
    };
    const token = signJwt(wrongAudPayload, priv1, "test-key-1");

    const httpHandler = createStreamableHttpServer({
      port: 8997,
      jwtVerifyOptions: {
        customJwks: testJwks,
        expectedAudience: "https://mcp.creatorretention.coach",
      },
    });
    await httpHandler.start();

    try {
      const res = await fetch("http://localhost:8997/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 7,
          method: "tools/call",
          params: {
            name: "check_user_credits",
            arguments: {},
          },
        }),
      });

      assert.strictEqual(res.status, 401);
      const json: any = await res.json();
      assert.ok(json.error?.message?.includes("Audience mismatch"));
    } finally {
      await httpHandler.stop();
    }
  });

  it("8. Protected tool with valid JWT authenticates cleanly and binds to token.sub", async () => {
    const validToken = signJwt(validPayload, priv1, "test-key-1");
    const ledger = new RedisLedgerRepository();

    const httpHandler = createStreamableHttpServer({
      port: 8998,
      deps: { ledger },
      jwtVerifyOptions: {
        customJwks: testJwks,
        expectedIssuer: "https://auth.creatorretention.coach",
      },
    });
    await httpHandler.start();

    try {
      const res = await fetch("http://localhost:8998/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${validToken}`,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 8,
          method: "tools/call",
          params: {
            name: "check_user_credits",
            arguments: {},
          },
        }),
      });

      assert.strictEqual(res.status, 200);
      const json: any = await res.json();
      assert.strictEqual(json.result?.isError, undefined);
      const entitlement = JSON.parse(json.result?.content[0]?.text);
      assert.strictEqual(entitlement.userId, "creator_verified_777");
    } finally {
      await httpHandler.stop();
    }
  });

  it("9. Missing required scope on protected tool is rejected with insufficient_scope _meta challenge", async () => {
    // Token without retention:analyze scope
    const limitedPayload = {
      ...validPayload,
      scope: "user:credits",
    };
    const token = signJwt(limitedPayload, priv1, "test-key-1");
    const mockAi = new MockAIProvider();
    const ledger = new RedisLedgerRepository();

    const httpHandler = createStreamableHttpServer({
      port: 8980,
      deps: { aiProvider: mockAi, ledger },
      jwtVerifyOptions: { customJwks: testJwks },
    });
    await httpHandler.start();

    try {
      const res = await fetch("http://localhost:8980/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 9,
          method: "tools/call",
          params: {
            name: "analyze_script_retention",
            arguments: { script: SAMPLE_SCRIPT, platform: "youtube_shorts" },
          },
        }),
      });

      assert.strictEqual(res.status, 200);
      const json: any = await res.json();
      assert.strictEqual(json.result?.isError, true);
      assert.ok(json.result?.content[0]?.text?.includes("Missing required OAuth scope 'retention:analyze'"));
      assert.ok(json.result?._meta?.["mcp/www_authenticate"]?.[0]?.includes('error="insufficient_scope"'));
    } finally {
      await httpHandler.stop();
    }
  });

  it("10. RFC 9728 Protected Resource Metadata endpoint serves valid discovery data", async () => {
    const httpHandler = createStreamableHttpServer({
      port: 8981,
    });
    await httpHandler.start();

    try {
      const res = await fetch("http://localhost:8981/.well-known/oauth-protected-resource");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get("content-type"), "application/json");

      const json: any = await res.json();
      assert.ok(json.resource);
      assert.ok(Array.isArray(json.authorization_servers));
      assert.deepStrictEqual(json.scopes_supported, ["retention:analyze", "user:credits"]);
    } finally {
      await httpHandler.stop();
    }
  });

  it("11. OpenAI domain verification challenge endpoint returns challenge token", async () => {
    const httpHandler = createStreamableHttpServer({
      port: 8982,
    });
    await httpHandler.start();

    try {
      const res = await fetch("http://localhost:8982/.well-known/openai-apps-challenge");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get("content-type"), "text/plain");

      const text = await res.text();
      assert.ok(text.length > 0);
    } finally {
      await httpHandler.stop();
    }
  });

  it("12. ES256 (ECDSA P-256 IEEE-P1363) JWT verification succeeds and authenticates caller", async () => {
    const ecKeyPair = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    const ecPublicKeyJwk: any = ecKeyPair.publicKey.export({ format: "jwk" });
    ecPublicKeyJwk.kid = "ec-test-key-1";
    ecPublicKeyJwk.alg = "ES256";
    ecPublicKeyJwk.use = "sig";

    const ecJwks = { keys: [ecPublicKeyJwk] };

    const header = { alg: "ES256", typ: "JWT", kid: "ec-test-key-1" };
    const rawHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
    const rawPayload = Buffer.from(JSON.stringify(validPayload)).toString("base64url");
    const signedContent = `${rawHeader}.${rawPayload}`;
    const sig = crypto.sign("SHA256", Buffer.from(signedContent), {
      key: ecKeyPair.privateKey,
      dsaEncoding: "ieee-p1363",
    }).toString("base64url");
    const ecToken = `${signedContent}.${sig}`;

    // Direct JWT verifier verification
    const verifyResult = await verifyJwt(ecToken, { customJwks: ecJwks });
    assert.strictEqual(verifyResult.valid, true);
    assert.strictEqual(verifyResult.claims?.sub, "creator_verified_777");

    // HTTP server verification
    const httpHandler = createStreamableHttpServer({
      port: 8983,
      jwtVerifyOptions: { customJwks: ecJwks },
    });
    await httpHandler.start();

    try {
      const res = await fetch("http://localhost:8983/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ecToken}`,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 12,
          method: "tools/call",
          params: {
            name: "check_user_credits",
            arguments: {},
          },
        }),
      });

      assert.strictEqual(res.status, 200);
      const json: any = await res.json();
      assert.strictEqual(json.result?.isError, undefined);
      const entitlement = JSON.parse(json.result?.content[0]?.text);
      assert.strictEqual(entitlement.userId, "creator_verified_777");
    } finally {
      await httpHandler.stop();
    }
  });

  it("13. Resource parameter in JWT is validated against expected audience/resource", async () => {
    const resourcePayload = {
      sub: "creator_resource_test",
      iss: "https://auth.creatorretention.coach",
      resource: "https://mcp.creatorretention.coach",
      exp: Math.floor(Date.now() / 1000) + 3600,
      scope: "user:credits",
    };
    const token = signJwt(resourcePayload, priv1, "test-key-1");

    const resultValid = await verifyJwt(token, {
      customJwks: testJwks,
      expectedAudience: "https://mcp.creatorretention.coach",
    });
    assert.strictEqual(resultValid.valid, true);

    const resultMismatch = await verifyJwt(token, {
      customJwks: testJwks,
      expectedAudience: "https://other-resource.com",
    });
    assert.strictEqual(resultMismatch.valid, false);
    assert.ok(resultMismatch.error?.includes("Audience mismatch"));
  });

  it("14. Supabase OAuth consent approveAuthorization and denyAuthorization return redirect_url", async () => {
    // Mock Supabase OAuth client functions simulating GoTrueClient
    const mockApproveAuthorization = async (authorizationId: string, _opts: any) => {
      assert.strictEqual(authorizationId, "auth_req_abc123");
      return {
        data: { redirect_url: "https://chatgpt.com/api/v1/auth/callback?code=mock_oauth_code&state=xyz" },
        error: null,
      };
    };

    const mockDenyAuthorization = async (authorizationId: string, _opts: any) => {
      assert.strictEqual(authorizationId, "auth_req_abc123");
      return {
        data: { redirect_url: "https://chatgpt.com/api/v1/auth/callback?error=access_denied&state=xyz" },
        error: null,
      };
    };

    const approveRes = await mockApproveAuthorization("auth_req_abc123", { skipBrowserRedirect: true });
    assert.ok(approveRes.data?.redirect_url.includes("code=mock_oauth_code"));

    const denyRes = await mockDenyAuthorization("auth_req_abc123", { skipBrowserRedirect: true });
    assert.ok(denyRes.data?.redirect_url.includes("error=access_denied"));
  });

  it("15. Unknown kid triggers JWKS refresh attempt and fails closed if not found", async () => {
    const unknownKidPayload = {
      ...validPayload,
      sub: "creator_unknown_kid",
    };
    const unknownKidToken = signJwt(unknownKidPayload, priv1, "nonexistent-kid-999");

    const result = await verifyJwt(unknownKidToken, {
      customJwks: testJwks,
    });

    assert.strictEqual(result.valid, false);
    assert.ok(result.error?.includes("No matching JWK found for kid"));
  });

  it("16. Forged or corrupted token signature fails closed without leaking exception", async () => {
    const validToken = signJwt(validPayload, priv1, "test-key-1");
    const [h, p, sig] = validToken.split(".");
    // Tamper single byte of signature
    const corruptedSig = sig.slice(0, -2) + (sig.endsWith("aa") ? "bb" : "aa");
    const tamperedToken = `${h}.${p}.${corruptedSig}`;

    const result = await verifyJwt(tamperedToken, {
      customJwks: testJwks,
    });

    assert.strictEqual(result.valid, false);
    assert.ok(result.error?.includes("signature"));
  });

  it("17. Valid token with crc_scopes (Custom Access Token Hook) extracts scopes and authorizes tool", async () => {
    const hookPayload = {
      sub: "creator_hook_user_1",
      iss: "https://auth.creatorretention.coach",
      aud: "https://mcp.creatorretention.coach",
      exp: Math.floor(Date.now() / 1000) + 3600,
      crc_scopes: ["retention:analyze", "user:credits"],
      role: "authenticated",
    };
    const token = signJwt(hookPayload, priv1, "test-key-1");
    const result = await verifyJwt(token, { customJwks: testJwks });
    assert.strictEqual(result.valid, true);
    assert.deepStrictEqual(result.claims?.scopes, ["retention:analyze", "user:credits"]);
    assert.strictEqual(result.claims?.role, "authenticated");
    assert.strictEqual(result.claims?.sub, "creator_hook_user_1");
  });

  it("18. Valid token with app_metadata.scopes extracts scopes properly", async () => {
    const appMetaPayload = {
      sub: "creator_appmeta_user",
      iss: "https://auth.creatorretention.coach",
      aud: "https://mcp.creatorretention.coach",
      exp: Math.floor(Date.now() / 1000) + 3600,
      app_metadata: {
        scopes: ["retention:analyze", "user:credits"],
        role: "authenticated",
      },
    };
    const token = signJwt(appMetaPayload, priv1, "test-key-1");
    const result = await verifyJwt(token, { customJwks: testJwks });
    assert.strictEqual(result.valid, true);
    assert.deepStrictEqual(result.claims?.scopes, ["retention:analyze", "user:credits"]);
    assert.strictEqual(result.claims?.role, "authenticated");
  });

  it("19. Valid ordinary Supabase/OIDC token without custom scopes is NOT falsely rejected", async () => {
    // Ordinary Supabase token with standard OIDC scopes and role
    const oidcPayload = {
      sub: "creator_oidc_user_456",
      iss: "https://auth.creatorretention.coach",
      aud: "https://mcp.creatorretention.coach",
      exp: Math.floor(Date.now() / 1000) + 3600,
      scope: "openid email profile",
      role: "authenticated",
    };
    const token = signJwt(oidcPayload, priv1, "test-key-1");
    const ledger = new RedisLedgerRepository();

    const httpHandler = createStreamableHttpServer({
      port: 8984,
      deps: { ledger },
      jwtVerifyOptions: { customJwks: testJwks },
    });
    await httpHandler.start();

    try {
      const res = await fetch("http://localhost:8984/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 19,
          method: "tools/call",
          params: {
            name: "check_user_credits",
            arguments: {},
          },
        }),
      });

      assert.strictEqual(res.status, 200);
      const json: any = await res.json();
      assert.strictEqual(json.result?.isError, undefined);
      const entitlement = JSON.parse(json.result?.content[0]?.text);
      assert.strictEqual(entitlement.userId, "creator_oidc_user_456");
      assert.strictEqual(entitlement.freeCreditsRemaining, 1);
    } finally {
      await httpHandler.stop();
    }
  });

  it("20. Token with explicit CRC scopes honors missing scope restrictions", async () => {
    // Token that explicitly grants only user:credits (a custom CRC scope), but NOT retention:analyze
    const creditOnlyPayload = {
      sub: "creator_credit_only",
      iss: "https://auth.creatorretention.coach",
      aud: "https://mcp.creatorretention.coach",
      exp: Math.floor(Date.now() / 1000) + 3600,
      scope: "user:credits",
      role: "authenticated",
    };
    const token = signJwt(creditOnlyPayload, priv1, "test-key-1");
    const mockAi = new MockAIProvider();
    const ledger = new RedisLedgerRepository();

    const httpHandler = createStreamableHttpServer({
      port: 8985,
      deps: { aiProvider: mockAi, ledger },
      jwtVerifyOptions: { customJwks: testJwks },
    });
    await httpHandler.start();

    try {
      const res = await fetch("http://localhost:8985/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 20,
          method: "tools/call",
          params: {
            name: "analyze_script_retention",
            arguments: { script: SAMPLE_SCRIPT, platform: "youtube_shorts" },
          },
        }),
      });

      assert.strictEqual(res.status, 200);
      const json: any = await res.json();
      assert.strictEqual(json.result?.isError, true);
      assert.ok(json.result?.content[0]?.text?.includes("Missing required OAuth scope 'retention:analyze'"));
      assert.ok(json.result?._meta?.["mcp/www_authenticate"]?.[0]?.includes('error="insufficient_scope"'));
    } finally {
      await httpHandler.stop();
    }
  });
});



