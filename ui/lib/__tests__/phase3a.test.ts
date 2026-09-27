import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";

describe("Phase 3A: Marketing & Studio Consistency", () => {
  it("1. TrustSection script storage statement accurately reflects authenticated RLS workspace", () => {
    const trustPath = path.resolve(__dirname, "../../components/marketing/TrustSection.tsx");
    const trustSource = fs.readFileSync(trustPath, "utf-8");

    // Must explicitly mention authenticated creators and PostgreSQL Row-Level Security (RLS)
    assert.ok(
      trustSource.includes("PostgreSQL Row-Level Security (RLS)"),
      "TrustSection must accurately describe private workspace storage with RLS"
    );

    // Must mention zero-credit re-analysis
    assert.ok(
      trustSource.includes("Zero-Credit Re-Analysis"),
      "TrustSection must accurately describe zero-credit re-analysis"
    );
  });

  it("2. StudioComposer provides actionable ad-blocker guidance", () => {
    const studioComposerPath = path.resolve(__dirname, "../../components/workspace/StudioComposer.tsx");
    const studioComposerSource = fs.readFileSync(studioComposerPath, "utf-8");

    const expectedGuidance =
      "Payment window could not be opened. If you are using an ad-blocker or privacy extension (like Brave Shields or uBlock Origin), please allow checkout.razorpay.com and refresh.";

    assert.ok(
      studioComposerSource.includes(expectedGuidance),
      "StudioComposer must provide actionable ad-blocker guidance"
    );
  });

  it("3. StudioComposer implements modal.ondismiss reset", () => {
    const studioComposerPath = path.resolve(__dirname, "../../components/workspace/StudioComposer.tsx");
    const studioComposerSource = fs.readFileSync(studioComposerPath, "utf-8");

    assert.ok(
      studioComposerSource.includes("ondismiss") && studioComposerSource.includes("setLoadingUnlock(false)"),
      "StudioComposer must reset loadingUnlock to false on modal dismiss"
    );
  });

  it("4. StudioComposer wires useRouter() and invokes router.refresh() on credit mutations", () => {
    const studioComposerPath = path.resolve(__dirname, "../../components/workspace/StudioComposer.tsx");
    const studioComposerSource = fs.readFileSync(studioComposerPath, "utf-8");

    // useRouter import and invocation
    assert.ok(
      studioComposerSource.includes('import { useRouter } from "next/navigation"'),
      "StudioComposer must import useRouter from next/navigation"
    );
    assert.ok(
      studioComposerSource.includes("const router = useRouter()"),
      "StudioComposer must initialize router"
    );

    // Occurrences of router.refresh()
    const refreshMatches = studioComposerSource.match(/router\.refresh\(\)/g);
    assert.ok(
      refreshMatches && refreshMatches.length >= 2,
      "StudioComposer must call router.refresh() on analysis completion and payment verification"
    );
  });
});

