import { describe, expect, it } from "bun:test";

import { decideAutomatedReview } from "@/lib/submission-review-decision";
import type { ReviewChecks } from "@/lib/submission-review-types";

function cleanChecks(): ReviewChecks {
  return {
    assets: { decision: "pass", reasons: [] },
    policy: { decision: "pass", confidence: 0.96, reasons: [], flags: [] },
    duplicates: {
      decision: "pass",
      reasons: [],
      exactMatches: [],
      visualMatches: [],
      semanticMatches: [],
      metadataMatches: [],
    },
    autopilot: { applied: false, dryRun: false, reason: null },
  };
}

describe("decideAutomatedReview", () => {
  it("auto-approves only clean high-confidence submissions", () => {
    const result = decideAutomatedReview(cleanChecks());
    expect(result.decision).toBe("auto_approve");
    expect(result.canApply).toBe(true);
  });

  it("holds clean submissions below the first-week approval confidence", () => {
    const checks = cleanChecks();
    checks.policy.confidence = 0.94;
    const result = decideAutomatedReview(checks);
    expect(result.decision).toBe("hold");
    expect(result.reasonCode).toBe("low_confidence");
  });

  it("auto-rejects exact asset duplicates", () => {
    const checks = cleanChecks();
    checks.duplicates.decision = "fail";
    checks.duplicates.exactMatches.push({
      id: "pet_existing",
      slug: "existing",
      displayName: "Existing",
      status: "pending",
      matchedFields: ["spriteSha256"],
    });
    const result = decideAutomatedReview(checks);
    expect(result.decision).toBe("auto_reject");
    expect(result.reasonCode).toBe("duplicate_exact_asset");
  });

  it("auto-approves metadata-only overlaps", () => {
    const checks = cleanChecks();
    checks.duplicates.decision = "hold";
    checks.duplicates.metadataMatches.push({
      id: "pet_existing",
      slug: "existing",
      displayName: "Existing",
      status: "approved",
      matchedFields: ["creditName"],
    });
    const result = decideAutomatedReview(checks);
    expect(result.decision).toBe("auto_approve");
    expect(result.reasonCode).toBe("clean_unique_submission");
  });

  it("auto-rejects 100% visual sprite duplicates", () => {
    const checks = cleanChecks();
    checks.duplicates.decision = "fail";
    checks.duplicates.visualMatches.push({
      id: "pet_existing",
      slug: "existing",
      displayName: "Existing",
      status: "pending",
      visualDistance: 0,
    });
    const result = decideAutomatedReview(checks);
    expect(result.decision).toBe("auto_reject");
    expect(result.reasonCode).toBe("duplicate_identical_sprite");
  });

  it("holds near-exact visual matches without corroboration", () => {
    const checks = cleanChecks();
    checks.duplicates.decision = "hold";
    checks.duplicates.visualMatches.push({
      id: "pet_existing",
      slug: "existing",
      displayName: "Existing",
      status: "approved",
      visualDistance: 2,
    });
    const result = decideAutomatedReview(checks);
    expect(result.decision).toBe("hold");
    expect(result.reasonCode).toBe("duplicate_visual_hold");
  });

  it("auto-rejects near-exact visual matches with metadata corroboration", () => {
    const checks = cleanChecks();
    checks.duplicates.decision = "fail";
    checks.duplicates.visualMatches.push({
      id: "pet_existing",
      slug: "existing",
      displayName: "Existing",
      status: "approved",
      visualDistance: 2,
      matchedFields: ["displayName"],
    });
    const result = decideAutomatedReview(checks);
    expect(result.decision).toBe("auto_reject");
    expect(result.reasonCode).toBe("duplicate_near_exact_sprite");
  });

  it("auto-rejects pending near-exact visual matches with metadata corroboration", () => {
    const checks = cleanChecks();
    checks.duplicates.decision = "fail";
    checks.duplicates.visualMatches.push({
      id: "pet_existing",
      slug: "existing",
      displayName: "Existing",
      status: "pending",
      visualDistance: 2,
      matchedFields: ["displayName"],
    });
    const result = decideAutomatedReview(checks);
    expect(result.decision).toBe("auto_reject");
    expect(result.reasonCode).toBe("duplicate_near_exact_sprite");
  });

  it("holds semantic-only duplicate risk", () => {
    const checks = cleanChecks();
    checks.duplicates.decision = "hold";
    checks.duplicates.semanticMatches.push({
      id: "pet_existing",
      slug: "existing",
      displayName: "Existing",
      status: "approved",
      semanticScore: 0.9,
    });
    const result = decideAutomatedReview(checks);
    expect(result.decision).toBe("hold");
    expect(result.reasonCode).toBe("duplicate_semantic_hold");
  });

  it("holds policy flags instead of auto-rejecting", () => {
    const checks = cleanChecks();
    checks.policy = {
      decision: "hold",
      confidence: 0.91,
      reasons: ["hate_harassment: slur in description"],
      flags: [
        {
          category: "hate_harassment",
          severity: "high",
          confidence: 0.91,
          evidence: "slur in description",
        },
      ],
    };
    const result = decideAutomatedReview(checks);
    expect(result.decision).toBe("hold");
    expect(result.reasonCode).toBe("policy_review_hold");
  });
});
