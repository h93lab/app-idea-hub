import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureSeededIdeas: vi.fn(), getIdeaStats: vi.fn(), listIdeas: vi.fn(), getIdeaDetail: vi.fn(), getIdeasForComparison: vi.fn(),
  getOpenRouterSetting: vi.fn(), getPersonalDecision: vi.fn(), saveOpenRouterSetting: vi.fn(), listScrapedApps: vi.fn(), saveScrapedApp: vi.fn(), listCompetitorMonitors: vi.fn(), listCompetitorRatingHistory: vi.fn(), getCompetitorMonitor: vi.fn(), createCompetitorMonitor: vi.fn(), setCompetitorMonitorSchedule: vi.fn(), deleteCompetitorMonitor: vi.fn(), recordCompetitorMonitorCheck: vi.fn(), listKeywordExplorers: vi.fn(), listMarketingDescriptionArchives: vi.fn(), deleteMarketingDescriptionArchive: vi.fn(), getKeywordExplorer: vi.fn(), saveKeywordExplorer: vi.fn(), saveKeywordMarketingDescription: vi.fn(), getKeywordStoreSignals: vi.fn(),
  createChatMessage: vi.fn(), getThreadMessages: vi.fn(), scrapeStoreApp: vi.fn(), listOpenRouterModels: vi.fn(), completeOpenRouter: vi.fn(), createBatchJob: vi.fn(), getBatchJob: vi.fn(), listBatchJobs: vi.fn(), processNextBatchItem: vi.fn(), getPersonalWorkspace: vi.fn(), updatePersonalWorkspace: vi.fn(), exportPersonalWorkspace: vi.fn(), resetPersonalWorkspace: vi.fn(), refreshCompetitorMonitor: vi.fn(), createHeartbeatJob: vi.fn(), updateHeartbeatJob: vi.fn(), deleteHeartbeatJob: vi.fn(),
}));

vi.mock("./db", () => mocks);
vi.mock("./scraper", () => ({ scrapeStoreApp: mocks.scrapeStoreApp, parseStoreUrl: (sourceUrl: string) => ({ store: "google_play", externalId: "com.test", normalizedUrl: "https://play.google.com/store/apps/details?id=com.test" }) }));
vi.mock("./openrouter", () => ({ listOpenRouterModels: mocks.listOpenRouterModels, completeOpenRouter: mocks.completeOpenRouter, maskApiKey: (key: string) => `masked-${key.slice(-4)}` }));
vi.mock("./competitorMonitoring", () => ({ refreshCompetitorMonitor: mocks.refreshCompetitorMonitor }));
vi.mock("./_core/heartbeat", () => ({ createHeartbeatJob: mocks.createHeartbeatJob, updateHeartbeatJob: mocks.updateHeartbeatJob, deleteHeartbeatJob: mocks.deleteHeartbeatJob }));

import { appRouter } from "./routers";

const user = { id: 7, openId: "test-user", email: "test@example.com", name: "Test User", loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const caller = (req: any = {}) => appRouter.createCaller({ user, req, res: { clearCookie: vi.fn() } as any });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.ensureSeededIdeas.mockResolvedValue({ seeded: false, ideas: 200, competitors: 600 });
  mocks.getIdeaStats.mockResolvedValue({ ideas: 200, competitors: 600, lowCompetition: 80, highRevenue: 120, categories: [] });
  mocks.listIdeas.mockResolvedValue([{ id: 1, title: "Test idea", category: "Tools" }]);
  mocks.getIdeaDetail.mockResolvedValue({ id: 1, title: "Test idea", category: "Tools", summary: "Summary", targetAudience: "Users", problem: "Problem", solution: "Solution", uniqueValue: "Unique", subcategory: "Workflow", competitionLevel: "Low", competitionScore: 25, revenuePotential: "Strong", monetizationModel: "Subscription", mvpScope: "MVP", implementationPlan: "Plan", validationPlan: "Validate", risks: "Risks", competitors: [] });
  mocks.getIdeasForComparison.mockResolvedValue([{ id: 1, title: "Test idea", category: "Tools", summary: "Summary", targetAudience: "Users", problem: "Problem", solution: "Solution", uniqueValue: "Unique", subcategory: "Workflow", competitionLevel: "Low", competitionScore: 25, revenuePotential: "Strong", monetizationModel: "Subscription", mvpScope: "MVP", implementationPlan: "Plan", validationPlan: "Validate", risks: "Risks", competitors: [] }, { id: 2, title: "Second idea", category: "AI", summary: "Summary", targetAudience: "Teams", problem: "Problem", solution: "Solution", uniqueValue: "Unique", subcategory: "AI", competitionLevel: "Medium", competitionScore: 55, revenuePotential: "Very strong", monetizationModel: "Usage-based", mvpScope: "MVP", implementationPlan: "Plan", validationPlan: "Validate", risks: "Risks", competitors: [] }]);
  mocks.listScrapedApps.mockResolvedValue([]);
  mocks.listCompetitorMonitors.mockResolvedValue([]);
  mocks.listCompetitorRatingHistory.mockResolvedValue([{ id: 1, monitorId: 12, appName: "Test app", store: "google_play", rating: "4.2", capturedAt: new Date("2026-08-14T00:00:00Z") }]);
  mocks.getCompetitorMonitor.mockResolvedValue({ id: 12, userId: 7, appName: "Test app", sourceUrl: "https://play.google.com/store/apps/details?id=com.test", store: "google_play", scheduleCronTaskUid: null, lastVersion: null, lastRating: null, statusMessage: null, hasChanges: 0, lastCheckedAt: new Date(), createdAt: new Date() });
  mocks.createCompetitorMonitor.mockResolvedValue({ id: 12, userId: 7, appName: "Test app", sourceUrl: "https://play.google.com/store/apps/details?id=com.test", store: "google_play", scheduleCronTaskUid: null, lastVersion: null, lastRating: null, statusMessage: null, hasChanges: 0, lastCheckedAt: new Date(), createdAt: new Date() });
  mocks.refreshCompetitorMonitor.mockResolvedValue({ changed: false, baselineCaptured: true, statusMessage: "Baseline captured." });
  mocks.createHeartbeatJob.mockResolvedValue({ taskUid: "task-12" });
  mocks.updateHeartbeatJob.mockResolvedValue({});
  mocks.deleteHeartbeatJob.mockResolvedValue(undefined);
  mocks.setCompetitorMonitorSchedule.mockResolvedValue({ id: 12, scheduleCronTaskUid: "task-12" });
  mocks.deleteCompetitorMonitor.mockResolvedValue({ deleted: true });
  mocks.listKeywordExplorers.mockResolvedValue([{ id: 21, userId: 7, keyword: "offline invoice", difficulty: 30, competitorCount: 1, searchVolume: 0, cpiEstimate: null, notes: "", analysis: "", marketingDescription: null, marketingModel: null, marketingGeneratedAt: null, createdAt: new Date(), updatedAt: new Date() }]);
  mocks.listMarketingDescriptionArchives.mockResolvedValue([{ id: 31, userId: 7, keywordExplorerId: 21, appName: "Invoice Pocket", audience: "independent contractors", keyword: "offline invoice", tone: "friendly", language: "English", description: "A focused tool.", model: "test/model", createdAt: new Date() }]);
  mocks.deleteMarketingDescriptionArchive.mockResolvedValue({ deleted: true });
  mocks.getKeywordExplorer.mockResolvedValue({ id: 21, userId: 7, keyword: "offline invoice", difficulty: 30, competitorCount: 1, searchVolume: 0, cpiEstimate: null, notes: "", analysis: "Use long-tail tests.", marketingDescription: null, marketingModel: null, marketingGeneratedAt: null, createdAt: new Date(), updatedAt: new Date() });
  mocks.getKeywordStoreSignals.mockResolvedValue({ competitorCount: 1, examples: ["Invoice tool"] });
  mocks.saveKeywordExplorer.mockResolvedValue({ id: 21, userId: 7, keyword: "offline invoice", difficulty: 30, competitorCount: 1, searchVolume: 0, cpiEstimate: null, notes: "", analysis: "Use long-tail tests.", marketingDescription: null, marketingModel: null, marketingGeneratedAt: null, createdAt: new Date(), updatedAt: new Date() });
  mocks.saveKeywordMarketingDescription.mockResolvedValue({ explorer: { id: 21, keyword: "offline invoice", marketingDescription: "# Offline invoices\n\nA focused tool.", marketingModel: "test/model" }, archive: { id: 31, keyword: "offline invoice", description: "# Offline invoices\n\nA focused tool." } });
  mocks.getOpenRouterSetting.mockResolvedValue({ userId: 7, apiKey: "sk-or-test-key", selectedModel: "test/model", modelLabel: "Test model" });
  mocks.saveOpenRouterSetting.mockResolvedValue({ userId: 7, apiKey: "sk-or-test-key", selectedModel: "test/model", modelLabel: "Test model" });
  mocks.listOpenRouterModels.mockResolvedValue([{ id: "test/model", name: "Test model" }]);
  mocks.scrapeStoreApp.mockResolvedValue({ store: "google_play", externalId: "com.test", sourceUrl: "https://play.google.com/store/apps/details?id=com.test", name: "Test app", screenshots: [], reviews: [], rawData: {}, reviewStatus: "ok" });
  mocks.saveScrapedApp.mockResolvedValue({ id: 10, name: "Test app" });
  mocks.createChatMessage.mockResolvedValue({ threadId: 55 });
  mocks.createBatchJob.mockResolvedValue({ id: 8, userId: 7, status: "pending", totalCount: 2, successCount: 0, failedCount: 0, items: [] });
  mocks.getBatchJob.mockResolvedValue({ id: 8, userId: 7, status: "processing", totalCount: 2, successCount: 1, failedCount: 0, items: [] });
  mocks.listBatchJobs.mockResolvedValue([{ id: 8, userId: 7, status: "completed", totalCount: 2, successCount: 2, failedCount: 0 }]);
  mocks.processNextBatchItem.mockResolvedValue({ id: 8, userId: 7, status: "processing", totalCount: 2, successCount: 1, failedCount: 0, items: [] });
  mocks.getPersonalDecision.mockResolvedValue({ score: 36, recommendation: "Keep in inbox", completed: 0, totalChecks: 5, validationRatio: 0, gross: 180, afterStoreFee: 153, net: 83, financialScore: 100 });
  mocks.getPersonalWorkspace.mockResolvedValue({ userId: 7, status: "Inbox", customScore: 72, validationChecklist: [], validationArtifacts: {}, flutterBlueprint: {}, financialModel: {}, asoMetadata: {}, backlogTasks: [] });
  mocks.updatePersonalWorkspace.mockResolvedValue({ userId: 7, status: "Validating", customScore: 80, validationChecklist: [], flutterBlueprint: {}, financialModel: {}, asoMetadata: {}, backlogTasks: [] });
  mocks.exportPersonalWorkspace.mockResolvedValue({ exportedAt: new Date().toISOString(), workspace: { userId: 7 } });
  mocks.resetPersonalWorkspace.mockResolvedValue({ userId: 7, status: "Inbox", customScore: 0, validationChecklist: [], flutterBlueprint: {}, financialModel: {}, asoMetadata: {}, backlogTasks: [] });
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

  it("compares ideas and prepares Markdown reports", async () => {
    const compared = await caller().ideas.compare({ ids: [1, 2] });
    expect(compared).toHaveLength(2);
    const report = await caller().ideas.compareReport({ ids: [1, 2], format: "markdown" });
    expect(report.markdown).toContain("Idea comparison");
    expect(mocks.getIdeasForComparison).toHaveBeenCalledWith([1, 2]);
  });

  it("returns a detailed idea or a typed not-found error", async () => {
    const result = await caller().ideas.get({ id: 1 });
    expect(result.title).toBe("Test idea");
    mocks.getIdeaDetail.mockResolvedValueOnce(undefined);
    await expect(caller().ideas.get({ id: 99 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("scraper procedures", () => {
  it("creates, lists, reads, and advances a batch job", async () => {
    const created = await caller().scraper.batchCreate({ sourceUrls: ["https://play.google.com/store/apps/details?id=com.test", "https://apps.apple.com/us/app/test/id123456789"] });
    expect(created.id).toBe(8);
    expect(await caller().scraper.batchList()).toHaveLength(1);
    expect((await caller().scraper.batchGet({ batchId: 8 }))?.status).toBe("processing");
    expect((await caller().scraper.batchProcessNext({ batchId: 8 }))?.successCount).toBe(1);
    expect(mocks.createBatchJob).toHaveBeenCalledWith(7, expect.arrayContaining([expect.stringContaining("play.google.com")]));
    expect(mocks.processNextBatchItem).toHaveBeenCalledWith(7, 8);
  });

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

describe("personal workspace procedures", () => {
  it("returns the backend decision engine result", async () => {
    const result = await caller().personal.decision();
    expect(result?.recommendation).toBe("Keep in inbox");
    expect(mocks.getPersonalDecision).toHaveBeenCalledWith(7);
  });

  it("loads, updates, and exports the private workspace", async () => {
    expect((await caller().personal.get())?.customScore).toBe(72);
    expect((await caller().personal.update({ patch: { customScore: 80, status: "Validating" } }))?.status).toBe("Validating");
    expect((await caller().personal.export()).workspace).toEqual({ userId: 7 });
    expect((await caller().personal.reset()).status).toBe("Inbox");
    expect(mocks.updatePersonalWorkspace).toHaveBeenCalledWith(7, { customScore: 80, status: "Validating" });
    expect(mocks.resetPersonalWorkspace).toHaveBeenCalledWith(7);
  });

  it("persists generated Validation Lab artifacts", async () => {
    const result = await caller().personal.validationGenerate({ type: "smokeTest", brief: "Test a contractor workflow" });
    expect(result.content).toContain("ten interviews");
    expect(mocks.updatePersonalWorkspace).toHaveBeenCalledWith(7, expect.objectContaining({ validationArtifacts: expect.objectContaining({ smokeTest: "Validate with ten interviews." }) }));
  });

  it("routes personal AI ideation through the selected OpenRouter model", async () => {
    const result = await caller().personal.generate({ brief: "Offline-first utility for contractors", mode: "challenge" });
    expect(result.content).toContain("ten interviews");
    expect(mocks.completeOpenRouter).toHaveBeenCalledWith(expect.objectContaining({ model: "test/model", messages: expect.arrayContaining([expect.objectContaining({ role: "user" })]) }));
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


describe("competitor monitoring and keyword explorer procedures", () => {
  it("normalizes a store URL, creates a monitor, and runs a manual check", async () => {
    const created = await caller().monitors.create({ appName: "Test app", sourceUrl: "https://play.google.com/store/apps/details?id=com.test&utm_source=ignored" });
    expect(created?.id).toBe(12);
    const checked = await caller().monitors.check({ id: 12 });
    expect(checked.changed).toBe(false);
    expect(mocks.createCompetitorMonitor).toHaveBeenCalledWith(7, { appName: "Test app", sourceUrl: "https://play.google.com/store/apps/details?id=com.test", store: "google_play" });
    expect(mocks.refreshCompetitorMonitor).toHaveBeenCalledWith(expect.objectContaining({ id: 12 }));
  });

  it("creates a six-field Heartbeat schedule and persists its task UID", async () => {
    const result = await caller({ headers: { cookie: "app_session_id=session-token" } }).monitors.schedule({ id: 12, cron: "0 0 * * * *" });
    expect(result?.scheduleCronTaskUid).toBe("task-12");
    expect(mocks.createHeartbeatJob).toHaveBeenCalledWith(expect.objectContaining({ path: "/api/scheduled/competitor-monitor", cron: "0 0 * * * *" }), "session-token");
    expect(mocks.setCompetitorMonitorSchedule).toHaveBeenCalledWith(7, 12, "task-12");
  });

  it("runs Keyword Explorer with saved listing evidence and the configured model", async () => {
    const result = await caller().keywords.explore({ keyword: "offline invoice", context: "Arabic-speaking contractors" });
    expect(result).toMatchObject({ keyword: "offline invoice", competitorCount: 1, difficulty: 30, searchVolume: null, cpiEstimate: null, model: "test/model" });
    expect(result.analysis).toContain("ten interviews");
    expect(mocks.getKeywordStoreSignals).toHaveBeenCalledWith(7, "offline invoice");
    expect(mocks.saveKeywordExplorer).toHaveBeenCalledWith(7, expect.objectContaining({ keyword: "offline invoice", competitorCount: 1, difficulty: 30 }));
  });
});


describe("rating history and marketing description procedures", () => {
  it("lists and deletes owned marketing archive records", async () => {
    const archives = await caller().keywords.archives();
    expect(archives[0]).toMatchObject({ id: 31, appName: "Invoice Pocket", keyword: "offline invoice" });
    await caller().keywords.deleteArchive({ id: 31 });
    expect(mocks.listMarketingDescriptionArchives).toHaveBeenCalledWith(7);
    expect(mocks.deleteMarketingDescriptionArchive).toHaveBeenCalledWith(7, 31);
  });

  it("returns owned competitor rating history points", async () => {
    const result = await caller().monitors.ratingHistory();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ monitorId: 12, rating: "4.2", appName: "Test app" });
    expect(mocks.listCompetitorRatingHistory).toHaveBeenCalledWith(7);
  });

  it("uses the selected keyword and OpenRouter model to persist marketing copy", async () => {
    const result = await caller().keywords.generateMarketingDescription({ keywordExplorerId: 21, appName: "Invoice Pocket", audience: "independent contractors", tone: "friendly", language: "English" });
    expect(result.description).toContain("Validate with ten interviews.");
    expect(result.model).toBe("test/model");
    expect(mocks.saveKeywordMarketingDescription).toHaveBeenCalledWith(7, 21, { description: "Validate with ten interviews.", model: "test/model", appName: "Invoice Pocket", audience: "independent contractors", tone: "friendly", language: "English" });
  });
});
