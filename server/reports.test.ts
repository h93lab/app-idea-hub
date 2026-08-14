import { describe, expect, it } from "vitest";
import { ideaToMarkdown, comparisonToMarkdown, marketingDescriptionToMarkdown } from "./reports";

describe("reports markdown generation", () => {
  it("generates structured markdown for a single idea", () => {
    const markdown = ideaToMarkdown({
      id: 1, title: "Offline Invoice Builder", category: "Tools", subcategory: "Invoicing",
      summary: "Mobile invoicing", targetAudience: "Home contractors", problem: "Paper is messy",
      solution: "Offline app", uniqueValue: "Fast sync", monetizationModel: "Subscription",
      competitionLevel: "Low", competitionScore: 25, revenuePotential: "Strong",
      mvpScope: "PDF export", implementationPlan: "Phase 1", validationPlan: "Interview",
      risks: "Adoption", competitors: [{ name: "Notion", platform: "Web", positioning: "Workspace", strengths: "Flexible", weaknesses: "Complex", differentiation: "Focused", monetization: "SaaS", threatLevel: "Medium" }]
    });
    expect(markdown).toContain("# Offline Invoice Builder");
    expect(markdown).toContain("Notion");
    expect(markdown).toContain("Home contractors");
  });

  it("formats an archived marketing description for export", () => {
    const markdown = marketingDescriptionToMarkdown({ appName: "Invoice Pocket", audience: "Independent contractors", keyword: "offline invoice", tone: "friendly", language: "English", description: "A clear store draft.", model: "test/model", createdAt: "2026-08-14T00:00:00Z" });
    expect(markdown).toContain("# Invoice Pocket");
    expect(markdown).toContain("offline invoice");
    expect(markdown).toContain("A clear store draft.");
  });

  it("generates a comparison table for multiple ideas", () => {
    const markdown = comparisonToMarkdown([
      { id: 1, title: "Alpha App", category: "Tools", subcategory: "Notes", summary: "A", targetAudience: "A", problem: "P", solution: "S", uniqueValue: "U", monetizationModel: "Subscription", competitionLevel: "Low", competitionScore: 30, revenuePotential: "Strong", mvpScope: "M", implementationPlan: "I", validationPlan: "V", risks: "R", competitors: [{ name: "Comp 1", platform: "Web", positioning: "P", strengths: "S", weaknesses: "W", differentiation: "D", monetization: "M", threatLevel: "Low" }] },
      { id: 2, title: "Beta App", category: "AI", subcategory: "Bots", summary: "B", targetAudience: "B", problem: "P", solution: "S", uniqueValue: "U", monetizationModel: "Usage-based", competitionLevel: "High", competitionScore: 80, revenuePotential: "Very strong", mvpScope: "M", implementationPlan: "I", validationPlan: "V", risks: "R", competitors: [{ name: "Comp 2", platform: "Mobile", positioning: "P", strengths: "S", weaknesses: "W", differentiation: "D", monetization: "M", threatLevel: "High" }] },
    ]);
    expect(markdown).toContain("Idea comparison");
    expect(markdown).toContain("Alpha App");
    expect(markdown).toContain("Beta App");
  });
});
