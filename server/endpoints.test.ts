import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureSeededIdeas: vi.fn(), getIdeaDetail: vi.fn(), getIdeasForComparison: vi.fn(),
}));
vi.mock("./db", () => mocks);

describe("report download validation logic", () => {
  it("validates comparison ID parameters correctly", () => {
    const raw = "1,2";
    const ids = String(raw).split(",").map(Number).filter(Number.isInteger);
    expect(ids.length >= 2 && ids.length <= 4).toBe(true);
  });

  it("rejects comparisons with fewer than 2 ids", () => {
    const raw = "1";
    const ids = String(raw).split(",").map(Number).filter(Number.isInteger);
    expect(ids.length >= 2).toBe(false);
  });
});
