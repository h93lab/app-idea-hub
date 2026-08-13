import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  insertCalls: [] as unknown[],
  deleteCalls: [] as unknown[],
  app: { id: 42, userId: 7, store: "google_play" as const, externalId: "com.example", name: "Example", reviewStatus: "ok" as const },
}));

vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: () => ({
    insert: (table: unknown) => {
      state.insertCalls.push(table);
      return {
        values: (values: unknown) => ({
          onDuplicateKeyUpdate: async () => undefined,
          values,
        }),
      };
    },
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [state.app],
        }),
      }),
    }),
    delete: (table: unknown) => ({
      where: async () => {
        state.deleteCalls.push(table);
      },
    }),
  }),
}));

import { saveScrapedApp } from "./db";

describe("scraped app persistence", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "mysql://test";
    state.insertCalls.length = 0;
    state.deleteCalls.length = 0;
  });

  it("replaces screenshots and reviews instead of appending duplicates", async () => {
    await saveScrapedApp({
      userId: 7,
      store: "google_play",
      sourceUrl: "https://play.google.com/store/apps/details?id=com.example",
      externalId: "com.example",
      name: "Example",
      reviewStatus: "ok",
      screenshots: ["https://cdn.example/one.png"],
      reviews: [{ author: "A", content: "First review" }],
    });

    expect(state.deleteCalls).toHaveLength(2);
    expect(state.insertCalls).toHaveLength(3);
  });
});
