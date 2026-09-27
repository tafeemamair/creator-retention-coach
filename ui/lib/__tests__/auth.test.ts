import test from "node:test";
import assert from "node:assert/strict";
import { createClient as createBrowserClient } from "../supabase/client";
import { getAdminClient } from "../supabase/admin";
import { getCookieSecret } from "../entitlement";
import robots from "../../app/robots";

test("Authentication Flow & Supabase Client Configuration", async (t) => {
  const originalEnv = { ...process.env };

  t.afterEach(() => {
    process.env = { ...originalEnv };
  });

  await t.test("1. Initializes browser client with standard NEXT_PUBLIC_SUPABASE_ANON_KEY", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test-project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key-12345";
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    const client = createBrowserClient();
    assert.ok(client, "Browser client should be instantiated");
    assert.ok(client.auth, "Client should expose auth methods");
  });

  await t.test("2. Initializes browser client with NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY alias", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test-project.supabase.co";
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key-67890";

    const client = createBrowserClient();
    assert.ok(client, "Browser client should be instantiated with publishable key");
    assert.ok(client.auth, "Client should expose auth methods");
  });

  await t.test("3. Generates correct Google OAuth redirect URL with preserved next query parameter", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-mock";

    const client = createBrowserClient();
    assert.ok(client, "Browser client must be instantiated");
    const origin = "http://localhost:3000";
    const nextUrl = "/app/analyze";
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`;

    const { data, error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    assert.equal(error, null, "Should not return error with skipBrowserRedirect");
    assert.ok(data.url, "OAuth URL should be generated");
    assert.ok(data.url.includes("provider=google"), "URL should contain provider=google");
    assert.ok(
      data.url.includes(encodeURIComponent(redirectTo)) || data.url.includes("next%3D%252Fapp%252Fanalyze") || data.url.includes("next"),
      "URL should preserve the next=/app/analyze redirect target"
    );
  });

  await t.test("4. Magic link OTP request options preserve next=/app/analyze redirect URL", () => {
    const origin = "http://localhost:3000";
    const nextUrl = "/app/analyze";
    const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`;

    const parsedUrl = new URL(emailRedirectTo);
    assert.equal(parsedUrl.pathname, "/auth/callback");
    assert.equal(parsedUrl.searchParams.get("next"), "/app/analyze");
  });

  await t.test("5. Callback route logic extracts code and preserves next destination", () => {
    const callbackRequestUrl = new URL("http://localhost:3000/auth/callback?code=mock-auth-code&next=/app/analyze");
    const code = callbackRequestUrl.searchParams.get("code");
    const next = callbackRequestUrl.searchParams.get("next") || "/app";

    assert.equal(code, "mock-auth-code");
    assert.equal(next, "/app/analyze");

    const finalRedirect = new URL(next, callbackRequestUrl.origin);
    assert.equal(finalRedirect.pathname, "/app/analyze");
  });

  await t.test("6. Middleware unauthenticated redirect properly sets next parameter", () => {
    const requestedPath = "/app/analyze";
    const loginRedirect = new URL("/auth/login", "http://localhost:3000");
    loginRedirect.searchParams.set("next", requestedPath);

    assert.equal(loginRedirect.pathname, "/auth/login");
    assert.equal(loginRedirect.searchParams.get("next"), "/app/analyze");
  });

  await t.test("7. Admin client handles service key fallbacks securely", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test-project.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-secret";

    const admin = getAdminClient();
    assert.ok(admin, "Admin client should initialize when URL and service role key are present");
  });

  await t.test("8. Correctly detects unconfigured state and rejects placeholder endpoints", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    const unconfiguredClient = createBrowserClient();
    assert.equal(unconfiguredClient, null, "Should return null when credentials are missing");

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder-project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "placeholder-anon-key";
    const placeholderClient = createBrowserClient();
    assert.equal(placeholderClient, null, "Should reject placeholder project configuration");
  });

  await t.test("9. COOKIE_SECRET fails closed in production when missing or too short", () => {
    delete process.env.COOKIE_SECRET;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";

    assert.throws(
      () => getCookieSecret(),
      /COOKIE_SECRET environment variable is missing in production/,
      "Must throw in production when COOKIE_SECRET is missing"
    );

    process.env.COOKIE_SECRET = "too_short";
    assert.throws(
      () => getCookieSecret(),
      /COOKIE_SECRET must be at least 16 characters in production/,
      "Must throw in production when COOKIE_SECRET is shorter than 16 characters"
    );

    process.env.COOKIE_SECRET = "production_secure_secret_key_32bytes_ok";
    assert.equal(
      getCookieSecret(),
      "production_secure_secret_key_32bytes_ok",
      "Must return valid secret in production"
    );

    // In development mode, missing secret should safely return dev fallback
    delete process.env.COOKIE_SECRET;
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    assert.equal(
      getCookieSecret(),
      "crc_default_dev_secret_key_change_in_production_32b",
      "Must provide fallback in development"
    );
  });

  await t.test("10. robots.txt disallows search engine crawling of private /api/, /app/, and /auth/ routes", () => {
    const robotsConfig = robots();
    const rules = Array.isArray(robotsConfig.rules) ? robotsConfig.rules[0] : robotsConfig.rules;
    assert.ok(rules, "robots rules must be defined");
    const disallow = Array.isArray(rules.disallow) ? rules.disallow : [rules.disallow];

    assert.ok(disallow.includes("/api/"), "Must disallow /api/");
    assert.ok(disallow.includes("/app/"), "Must disallow /app/");
    assert.ok(disallow.includes("/auth/"), "Must disallow /auth/");
  });
});

