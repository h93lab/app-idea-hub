import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureSeededIdeas: vi.fn(), getIdeaStats: vi.fn(), listIdeas: vi.fn(), getIdeaDetail: vi.fn(),
  getOpenRouterSetting: vi.fn(), saveOpenRouterSetting: vi.fn(), listScrapedApps: vi.fn(), saveScrapedApp: vi.fn(),
  createChatMessage: vi.fn(), getThreadMessages: vi.fn(), scrapeStoreApp: vi.fn(), listOpenRouterModels: vi.fn(), completeOpenRouter: vi.fn(),
}));

vi.mock("./db", () => mocks);
vi.mock("./scraper", () => ({ scrapeStoreApp: mocks.scrapeStoreApp }));
vi.mock("./openrouter", () => ({ listOpenRouterModels: mocks.listOpenRouterModels, completeOpenRouter: mocks.completeOpenRouter, maskApiKey: (key: string) => `masked-${key.slice(-4)}` }));

import { appRouter } from "./routers";

const user = { id: 7, openId: "test-user", email: "test@example.com", name: "Test User", loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const caller = () => appRouter.createCaller({ user, req: {} as any, res: { clearCookie: vi.fn() } as any });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.ensureSeededIdeas.mockResolvedValue({ seeded: false, ideas: 200, competitors: 600 });
  mocks.getIdeaStats.mockResolvedValue({ ideas: 200, competitors: 600, lowCompetition: 80, highRevenue: 120, categories: [] });
  mocks.listIdeas.mockResolvedValue([{ id: 1, title: "Test idea", category: "Tools" }]);
  mocks.getIdeaDetail.mockResolvedValue({ id: 1, title: "Test idea", category: "Tools", summary: "Summary", targetAudience: "Users", problem: "Problem", solution: "Solution", monetizationModel: "Subscription", competitors: [] });
  mocks.listScrapedApps.mockResolvedValue([]);
  mocks.getOpenRouterSetting.mockResolvedValue({ userId: 7, apiKey: "sk-or-test-key", selectedModel: "test/model", modelLabel: "Test model" });
  mocks.saveOpenRouterSetting.mockResolvedValue({ userId: 7, apiKey: "sk-or-test-key", selectedModel: "test/model", modelLabel: "Test model" });
  mocks.listOpenRouterModels.mockResolvedValue([{ id: "test/model", name: "Test model" }]);
  mocks.scrapeStoreApp.mockResolvedValue({ store: "google_play", externalId: "com.test", sourceUrl: "https://play.google.com/store/apps/details?id=com.test", name: "Test app", screenshots: [], reviews: [], rawData: {}, reviewStatus: "ok" });
  mocks.saveScrapedApp.mockResolvedValue({ id: 10, name: "Test app" });
  mocks.createChatMessage.mockResolvedValue({ threadId: 55 });
  mocks.getThreadMessages.mockResolvedValue([{ id: 1, threadId: 55, role: "user", content: "How do I validate?", model: "test/model", createdAt: new Date() }]);
  mocks.completeOpenRouter.mockResolvedValue({ content: "Validate with ten interviews.", model: "test/model" });
});

describe("ideas procedures", () => {
  it("returns dashboard bootstrap and stats data", async () => {
    const bootstrap = await caller().dashboard.bootstrap();
    const stats = await caller().dashboard.stats();
    expect(bootstrap.ideas).toBe(200);
    expect(stats.competitors).toBe(600);
    expect(mocks.getIdeaStats).toHaveBeenCalledTimes(2);
  });

  it("seeds lazily and forwards browsing filters", async () => {
    const result = await caller().ideas.list({ search: "offline", category: "Tools", limit: 10, offset: 0 });
    expect(result).toEqual([{ id: 1, title: "Test idea", category: "Tools" }]);
    expect(mocks.ensureSeededIdeas).toHaveBeenCalledOnce();
    expect(mocks.listIdeas).toHaveBeenCalledWith({ search: "offline", category: "Tools", limit: 10, offset: 0 });
  });

  it("returns a detailed idea or a typed not-found error", async () => {
    const result = await caller().ideas.get({ id: 1 });
    expect(result.title).toBe("Test idea");
    mocks.getIdeaDetail.mockResolvedValueOnce(undefined);
    await expect(caller().ideas.get({ id: 99 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("scraper procedures", () => {
  it("scrapes and persists a listing for the authenticated user", async () => {
    const result = await caller().scraper.scrape({ sourceUrl: "https://play.google.com/store/apps/details?id=com.test" });
    expect(result.id).toBe(10);
    expect(mocks.saveScrapedApp).toHaveBeenCalledWith(expect.objectContaining({ userId: 7, externalId: "com.test" }));
  });

  it("lists only the authenticated user's saved listings", async () => {
    mocks.listScrapedApps.mockResolvedValueOnce([{ id: 10, userId: 7, name: "Test app", screenshots: [], reviews: [] }]);
    const result = await caller().scraper.list();
    expect(result[0]?.userId).toBe(7);
    expect(mocks.listScrapedApps).toHaveBeenCalledWith(7);
  });
});

describe("OpenRouter procedures", () => {
  it("returns masked settings without exposing the saved API key", async () => {
    const result = await caller().ai.settings();
    expect(result).toMatchObject({ configured: true, maskedApiKey: "masked--key" });
    expect(result).not.toHaveProperty("apiKey");
  });

  it("saves a selected model while preserving key handling", async () => {
    const result = await caller().ai.saveSettings({ selectedModel: "test/model", modelLabel: "Test model" });
    expect(result).toMatchObject({ configured: true, selectedModel: "test/model" });
    expect(mocks.saveOpenRouterSetting).toHaveBeenCalledWith(7, undefined, "test/model", "Test model");
  });

  it("returns message history for the authenticated thread", async () => {
    const result = await caller().ai.history({ threadId: 55 });
    expect(result[0]?.content).toBe("How do I validate?");
    expect(mocks.getThreadMessages).toHaveBeenCalledWith(7, 55);
  });

  it("lists models using the saved key without returning the key", async () => {
    const result = await caller().ai.models();
    expect(result[0]?.id).toBe("test/model");
    expect(mocks.listOpenRouterModels).toHaveBeenCalledWith("sk-or-test-key");
  });

  it("uses the selected model for contextual chat and stores the assistant response", async () => {
    const result = await caller().ai.chat({ ideaId: 1, prompt: "How do I validate?" });
    expect(result.content).toContain("ten interviews");
    expect(mocks.completeOpenRouter).toHaveBeenCalledWith(expect.objectContaining({ model: "test/model" }));
    expect(mocks.createChatMessage).toHaveBeenCalledTimes(2);
  });

  it("runs a focused analysis and stores the result in a new thread", async () => {
    const result = await caller().ai.analyzeIdea({ ideaId: 1, focus: "pricing" });
    expect(result).toMatchObject({ threadId: 55, content: "Validate with ten interviews." });
    expect(mocks.completeOpenRouter).toHaveBeenCalledWith(expect.objectContaining({ model: "test/model" }));
    expect(mocks.createChatMessage).toHaveBeenCalledWith(7, 1, "assistant", "Validate with ten interviews.", "test/model");
  });
});
