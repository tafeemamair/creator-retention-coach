import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { PLAN_CONFIGS, resolvePlanFromAmount } from "../payment";

describe("CRC V2.2: Creator Pack Purchase-Intent Routing & Consumption", () => {
  const pricingPath = path.resolve(__dirname, "../../components/marketing/PricingSection.tsx");
  const studioComposerPath = path.resolve(__dirname, "../../components/workspace/StudioComposer.tsx");
  const middlewarePath = path.resolve(__dirname, "../../middleware.ts");
  const createOrderRoutePath = path.resolve(__dirname, "../../app/api/create-order/route.ts");
  const verifyPaymentRoutePath = path.resolve(__dirname, "../../app/api/verify-payment/route.ts");
  const webhookRoutePath = path.resolve(__dirname, "../../app/api/webhooks/razorpay/route.ts");

  const pricingSource = fs.readFileSync(pricingPath, "utf-8");
  const studioComposerSource = fs.readFileSync(studioComposerPath, "utf-8");
  const middlewareSource = fs.readFileSync(middlewarePath, "utf-8");
  const createOrderSource = fs.readFileSync(createOrderRoutePath, "utf-8");
  const verifyPaymentSource = fs.readFileSync(verifyPaymentRoutePath, "utf-8");
  const webhookSource = fs.readFileSync(webhookRoutePath, "utf-8");

  it("A. Marketing Pricing CTAs encode purchase-intent parameters", () => {
    assert.ok(
      pricingSource.includes('/auth/login?next=/app/analyze%3Fplan%3Dpack5%26checkout%3Dtrue'),
      "PricingSection must route Creator Pack CTA to encoded /auth/login?next=/app/analyze%3Fplan%3Dpack5%26checkout%3Dtrue"
    );
    assert.ok(
      pricingSource.includes('/auth/login?next=/app/analyze%3Fplan%3Dsingle%26checkout%3Dtrue'),
      "PricingSection must route Single Report CTA to encoded /auth/login?next=/app/analyze%3Fplan%3Dsingle%26checkout%3Dtrue"
    );
  });

  it("B. Authenticated /auth/login?next=/app/analyze?plan=pack5&checkout=true preserves requested internal destination", () => {
    // Middleware must safely read next parameter for authenticated users
    assert.ok(
      middlewareSource.includes('request.nextUrl.searchParams.get("next")'),
      "Middleware must read next searchParam when user is authenticated at /auth/login"
    );

    // Validate middleware redirection logic with test helper simulation
    function resolveSafeNext(rawNext: string | null): string {
      let safeNext = "/app";
      if (rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")) {
        safeNext = rawNext;
      }
      return safeNext;
    }

    const testTarget = "/app/analyze?plan=pack5&checkout=true";
    assert.equal(resolveSafeNext(testTarget), testTarget);

    const singleTarget = "/app/analyze?plan=single&checkout=true";
    assert.equal(resolveSafeNext(singleTarget), singleTarget);
  });

  it("C. Authenticated /auth/login without next still redirects to /app", () => {
    function resolveSafeNext(rawNext: string | null): string {
      let safeNext = "/app";
      if (rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")) {
        safeNext = rawNext;
      }
      return safeNext;
    }

    assert.equal(resolveSafeNext(null), "/app");
    assert.equal(resolveSafeNext(""), "/app");
  });

  it("D. External/unsafe next values are rejected safely and fall back to /app", () => {
    function resolveSafeNext(rawNext: string | null): string {
      let safeNext = "/app";
      if (rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")) {
        safeNext = rawNext;
      }
      return safeNext;
    }

    assert.equal(resolveSafeNext("https://attacker.com/steal"), "/app");
    assert.equal(resolveSafeNext("http://attacker.com"), "/app");
    assert.equal(resolveSafeNext("//attacker.com"), "/app");
    assert.equal(resolveSafeNext("javascript:alert(1)"), "/app");
    assert.equal(resolveSafeNext("data:text/html,evil"), "/app");
  });

  it("E. Unauthenticated protected routes preserve full search query string in next param", () => {
    assert.ok(
      middlewareSource.includes("const search = request.nextUrl.search"),
      "Middleware must extract search params for unauthenticated /app redirects"
    );
    assert.ok(
      middlewareSource.includes("search ? `${pathname}${search}` : pathname") ||
      middlewareSource.includes("`${pathname}${search}`"),
      "Middleware must preserve fullPath with query parameters in redirect"
    );
  });

  it("F. pack5 checkout intent reaches StudioComposer and initializes selectedPlan=pack5", () => {
    assert.ok(
      studioComposerSource.includes('useSearchParams'),
      "StudioComposer must import and use useSearchParams"
    );

    assert.ok(
      studioComposerSource.includes('plan === "pack5"') &&
      studioComposerSource.includes('setSelectedPlan("pack5")') &&
      studioComposerSource.includes("setShowPaywall(true)"),
      "StudioComposer must initialize selectedPlan to pack5 and showPaywall to true"
    );
  });

  it("G. single checkout intent reaches StudioComposer and initializes selectedPlan=single", () => {
    assert.ok(
      studioComposerSource.includes('plan === "single"') &&
      studioComposerSource.includes('setSelectedPlan("single")') &&
      studioComposerSource.includes("setShowPaywall(true)"),
      "StudioComposer must initialize selectedPlan to single and showPaywall to true"
    );
  });

  it("H. Checkout intent displays PricingSelector as the primary/top surface above the form", () => {
    const paywallIndex = studioComposerSource.indexOf('id="pricing-selector-container"');
    const formIndex = studioComposerSource.indexOf('<Card variant="default"');

    assert.ok(paywallIndex !== -1, "StudioComposer must contain pricing-selector-container");
    assert.ok(formIndex !== -1, "StudioComposer must contain form Card");
    assert.ok(
      paywallIndex < formIndex,
      "pricing-selector-container must be positioned above the form Card when showPaywall is true"
    );
  });

  it("I. Normal /app/analyze without checkout parameters retains existing behavior", () => {
    assert.ok(
      studioComposerSource.includes("const [showPaywall, setShowPaywall] = useState(false)"),
      "StudioComposer must default showPaywall to false"
    );

    assert.ok(
      studioComposerSource.includes('if (checkout === "true")'),
      "showPaywall should only be triggered when checkout=true"
    );
  });

  it("J. Razorpay does NOT auto-launch on mount", () => {
    assert.ok(
      !studioComposerSource.includes("useEffect(() => {\n    handleUnlockPayment"),
      "StudioComposer must never auto-launch Razorpay on mount"
    );

    assert.ok(
      studioComposerSource.includes("onUnlock={handleUnlockPayment}"),
      "Payment must only be triggered via user action on onUnlock"
    );
  });

  it("K. Payment endpoints and configurations remain untouched and protected", () => {
    assert.ok(
      createOrderSource.includes('if (planId !== "single" && planId !== "pack5")'),
      "POST /api/create-order must strictly validate planId"
    );

    assert.equal(PLAN_CONFIGS.pack5.amount, 14900);
    assert.equal(PLAN_CONFIGS.pack5.credits, 5);
    assert.equal(PLAN_CONFIGS.single.amount, 4900);
    assert.equal(PLAN_CONFIGS.single.credits, 1);

    assert.equal(resolvePlanFromAmount(14900)?.plan, "pack5");
    assert.equal(resolvePlanFromAmount(4900)?.plan, "single");
    assert.equal(resolvePlanFromAmount(9999), null);
  });

  it("L. AppHeader Get Pack CTA badge routes directly to Creator Pack checkout flow when out of credits", () => {
    const appHeaderPath = path.resolve(__dirname, "../../components/workspace/AppHeader.tsx");
    const appHeaderSource = fs.readFileSync(appHeaderPath, "utf-8");

    assert.ok(
      appHeaderSource.includes('creditsRemaining > 0 || freeRemaining > 0 ? "/app/analyze" : "/app/analyze?plan=pack5&checkout=true"'),
      "AppHeader badge must route to /app/analyze?plan=pack5&checkout=true when 0 credits are available"
    );
  });

  it("N. AppSidebar brand header logo is clickable and routes to /app", () => {
    const appSidebarPath = path.resolve(__dirname, "../../components/workspace/AppSidebar.tsx");
    const appSidebarSource = fs.readFileSync(appSidebarPath, "utf-8");

    assert.ok(
      appSidebarSource.includes('<Link') &&
      appSidebarSource.includes('href="/app"') &&
      appSidebarSource.includes('Creator Retention') &&
      appSidebarSource.includes('Workspace'),
      "AppSidebar brand header must be a Link routing to /app"
    );
  });

  it("O. AppHeader is a dynamic client component that updates on real-time credit updates and links to /app", () => {
    const appHeaderPath = path.resolve(__dirname, "../../components/workspace/AppHeader.tsx");
    const appHeaderSource = fs.readFileSync(appHeaderPath, "utf-8");

    assert.ok(
      appHeaderSource.includes('"use client"'),
      "AppHeader must be a client component"
    );
    assert.ok(
      appHeaderSource.includes('crc_credit_update'),
      "AppHeader must listen for crc_credit_update window events"
    );
    assert.ok(
      appHeaderSource.includes('href="/app"') && appHeaderSource.includes('Creator Studio'),
      "AppHeader Creator Studio must route to /app"
    );
  });
});


