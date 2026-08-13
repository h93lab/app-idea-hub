import { describe, expect, it } from "vitest";
import { seedIdeas, seedSummary } from "./seedData";
import { parseStoreUrl } from "./scraper";

describe("seed catalog", () => {
  it("contains 200 ideas with exactly three tailored competitors each", () => {
    expect(seedIdeas).toHaveLength(200);
    expect(seedSummary.competitors).toBe(600);
    expect(seedIdeas.every(idea => idea.competitors.length === 3)).toBe(true);
    expect(new Set(seedIdeas.map(idea => idea.slug)).size).toBe(200);
    expect(new Set(seedIdeas.map(idea => idea.competitors.map(competitor => competitor.differentiation).join("|"))).size).toBe(200);
    expect(new Set(seedIdeas.map(idea => idea.competitors.map(competitor => competitor.name).join("|"))).size).toBeGreaterThan(5);
  });

  it("keeps all five catalog categories balanced", () => {
    expect(seedSummary.categories).toEqual({ Tools: 40, Health: 40, Education: 40, AI: 40, Games: 40 });
  });
});

describe("store URL parser", () => {
  it("parses a Google Play URL", () => {
    expect(parseStoreUrl("https://play.google.com/store/apps/details?id=com.example.app")).toEqual({
      store: "google_play",
      externalId: "com.example.app",
      normalizedUrl: "https://play.google.com/store/apps/details?id=com.example.app",
    });
  });

  it("parses an Apple App Store URL", () => {
    expect(parseStoreUrl("https://apps.apple.com/us/app/example/id123456789")).toEqual({
      store: "app_store",
      externalId: "123456789",
      normalizedUrl: "https://apps.apple.com/app/id123456789",
    });
  });

  it("rejects unsupported URLs", () => {
    expect(() => parseStoreUrl("https://example.com/apps/example")).toThrow("valid Google Play or Apple App Store URL");
  });
});
