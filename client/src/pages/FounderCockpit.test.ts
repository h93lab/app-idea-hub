import { describe, expect, it } from "vitest";
import { calculateNetScenario, calculateOpportunityScore } from "./FounderCockpit";

describe("Founder Cockpit calculations", () => {
  it("calculates a normalized opportunity score from five dimensions", () => {
    expect(calculateOpportunityScore({ marketDemand: 8, competitionScore: 6, monetizationScore: 9, flutterFeasibility: 8, personalFit: 10 })).toBe(82);
  });

  it("keeps monetization scenarios transparent and deterministic", () => {
    expect(calculateNetScenario({ price: 9, monthlyDownloads: 1000, conversionRate: 2, storeFee: 15, monthlyCosts: 70 })).toBe(83);
  });
});
