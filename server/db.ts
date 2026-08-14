import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  competitors,
  ideaChatMessages,
  ideaChatThreads,
  ideas,
  batchJobs,
  batchJobItems,
  openRouterSettings,
  personalWorkspaces,
  competitorMonitors,
  competitorRatingHistory,
  keywordExplorers,
  scrapedAppReviews,
  scrapedApps,
  scrapedAppScreenshots,
  users,
  type InsertUser,
} from "../drizzle/schema";
import { seedIdeas } from "./seedData";
import { ENV } from "./_core/env";
import { scrapeStoreApp } from "./scraper";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  } else {
    values.lastSignedIn = new Date();
    updateSet.lastSignedIn = values.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function ensureSeededIdeas() {
  const db = await getDb();
  if (!db) return { seeded: false, ideas: 0, competitors: 0 };
  const existing = await db.select({ count: sql<number>`count(*)` }).from(ideas);
  const count = Number(existing[0]?.count ?? 0);
  if (count > 0) {
    const existingSeeded = await db.select({ id: ideas.id, slug: ideas.slug, isSeeded: ideas.isSeeded }).from(ideas).limit(seedIdeas.length);
    if (count === seedIdeas.length && existingSeeded.length === seedIdeas.length && existingSeeded.every(item => item.isSeeded)) {
      const sample = await db.select({ positioning: competitors.positioning }).from(competitors).where(eq(competitors.ideaId, existingSeeded[0]!.id)).limit(1);
      if (!sample[0]?.positioning?.includes("primary category incumbent")) {
        await db.delete(competitors).where(inArray(competitors.ideaId, existingSeeded.map(item => item.id)));
        const competitorRows = seedIdeas.flatMap(seed => {
          const idea = existingSeeded.find(row => row.slug === seed.slug);
          return idea ? seed.competitors.map(competitor => ({ ideaId: idea.id, ...competitor })) : [];
        });
        if (competitorRows.length) await db.insert(competitors).values(competitorRows);
        return { seeded: true, ideas: count, competitors: competitorRows.length };
      }
    }
    return { seeded: false, ideas: count, competitors: 0 };
  }
  await db.insert(ideas).values(seedIdeas.map(({ competitors: _, ...idea }) => idea));
  const inserted = await db.select({ id: ideas.id, slug: ideas.slug }).from(ideas);
  const competitorRows = seedIdeas.flatMap(seed => {
    const idea = inserted.find(row => row.slug === seed.slug);
    return idea ? seed.competitors.map(competitor => ({ ideaId: idea.id, ...competitor })) : [];
  });
  if (competitorRows.length) await db.insert(competitors).values(competitorRows);
  return { seeded: true, ideas: seedIdeas.length, competitors: competitorRows.length };
}

export type IdeaListFilters = {
  search?: string;
  category?: "Tools" | "Health" | "Education" | "AI" | "Games";
  monetizationModel?: "Subscription" | "One-time" | "Freemium" | "Ads" | "Usage-based" | "Marketplace";
  competitionLevel?: "Low" | "Medium" | "High";
  limit?: number;
  offset?: number;
};

export async function listIdeas(filters: IdeaListFilters = {}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(like(ideas.title, term));
  }
  if (filters.category) conditions.push(eq(ideas.category, filters.category));
  if (filters.monetizationModel) conditions.push(eq(ideas.monetizationModel, filters.monetizationModel));
  if (filters.competitionLevel) conditions.push(eq(ideas.competitionLevel, filters.competitionLevel));
  return db.select().from(ideas).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(ideas.competitionScore)).limit(Math.min(filters.limit ?? 50, 100)).offset(filters.offset ?? 0);
}

export async function getIdeaDetail(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const idea = (await db.select().from(ideas).where(eq(ideas.id, id)).limit(1))[0];
  if (!idea) return undefined;
  const ideaCompetitors = await db.select().from(competitors).where(eq(competitors.ideaId, id));
  return { ...idea, competitors: ideaCompetitors };
}

export async function getIdeaStats() {
  const db = await getDb();
  if (!db) return { ideas: 0, competitors: 0, categories: [], lowCompetition: 0, highRevenue: 0 };
  const [ideaCount, competitorCount, lowCompetition, highRevenue, categories] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(ideas),
    db.select({ count: sql<number>`count(*)` }).from(competitors),
    db.select({ count: sql<number>`count(*)` }).from(ideas).where(eq(ideas.competitionLevel, "Low")),
    db.select({ count: sql<number>`count(*)` }).from(ideas).where(eq(ideas.revenuePotential, "Very strong")),
    db.select({ category: ideas.category, count: sql<number>`count(*)` }).from(ideas).groupBy(ideas.category),
  ]);
  return {
    ideas: Number(ideaCount[0]?.count ?? 0),
    competitors: Number(competitorCount[0]?.count ?? 0),
    lowCompetition: Number(lowCompetition[0]?.count ?? 0),
    highRevenue: Number(highRevenue[0]?.count ?? 0),
    categories: categories.map(row => ({ category: row.category, count: Number(row.count) })),
  };
}

export async function getOpenRouterSetting(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(openRouterSettings).where(eq(openRouterSettings.userId, userId)).limit(1))[0];
}

export async function saveOpenRouterSetting(userId: number, apiKey: string | undefined, selectedModel: string, modelLabel?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await getOpenRouterSetting(userId);
  const nextApiKey = apiKey?.trim() || existing?.apiKey;
  if (!nextApiKey) throw new Error("An OpenRouter API key is required");
  await db.insert(openRouterSettings).values({ userId, apiKey: nextApiKey, selectedModel, modelLabel }).onDuplicateKeyUpdate({ set: { apiKey: nextApiKey, selectedModel, modelLabel: modelLabel ?? null, updatedAt: new Date() } });
  return getOpenRouterSetting(userId);
}

export async function listScrapedApps(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const apps = await db.select().from(scrapedApps).where(eq(scrapedApps.userId, userId)).orderBy(desc(scrapedApps.updatedAt));
  return Promise.all(apps.map(async app => ({
    ...app,
    screenshots: await db.select().from(scrapedAppScreenshots).where(eq(scrapedAppScreenshots.appId, app.id)).orderBy(scrapedAppScreenshots.sortOrder),
    reviews: await db.select().from(scrapedAppReviews).where(eq(scrapedAppReviews.appId, app.id)).orderBy(desc(scrapedAppReviews.id)).limit(5),
  })));
}

export async function saveScrapedApp(payload: {
  userId: number; store: "google_play" | "app_store"; sourceUrl: string; externalId: string;
  name: string; developer?: string; description?: string; iconUrl?: string; rating?: string;
  ratingsCount?: number; version?: string; category?: string; price?: string; reviewStatus?: "ok" | "unavailable"; rawData?: Record<string, unknown>;
  screenshots?: string[]; reviews?: Array<{ author?: string; rating?: number; title?: string; content: string; reviewDate?: string; version?: string; rawData?: Record<string, unknown> }>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const values: typeof scrapedApps.$inferInsert = {
    userId: payload.userId, store: payload.store, sourceUrl: payload.sourceUrl, externalId: payload.externalId,
    name: payload.name, developer: payload.developer, description: payload.description, iconUrl: payload.iconUrl,
    rating: payload.rating, ratingsCount: payload.ratingsCount, version: payload.version, category: payload.category,
    price: payload.price, reviewStatus: payload.reviewStatus ?? "ok", rawData: payload.rawData,
  };
  await db.insert(scrapedApps).values(values).onDuplicateKeyUpdate({ set: { ...values, updatedAt: new Date() } });
  const app = (await db.select().from(scrapedApps).where(and(eq(scrapedApps.userId, payload.userId), eq(scrapedApps.store, payload.store), eq(scrapedApps.externalId, payload.externalId))).limit(1))[0];
  if (!app) throw new Error("Scraped app was not saved");
  await db.delete(scrapedAppScreenshots).where(eq(scrapedAppScreenshots.appId, app.id));
  await db.delete(scrapedAppReviews).where(eq(scrapedAppReviews.appId, app.id));
  if (payload.screenshots?.length) await db.insert(scrapedAppScreenshots).values(payload.screenshots.map((sourceUrl, sortOrder) => ({ appId: app.id, sourceUrl, sortOrder })));
  if (payload.reviews?.length) await db.insert(scrapedAppReviews).values(payload.reviews.slice(0, 100).map(review => ({ appId: app.id, ...review })));
  return app;
}

export async function getThreadMessages(userId: number, threadId: number) {
  const db = await getDb();
  if (!db) return [];
  const thread = (await db.select().from(ideaChatThreads).where(and(eq(ideaChatThreads.id, threadId), eq(ideaChatThreads.userId, userId))).limit(1))[0];
  if (!thread) return [];
  return db.select().from(ideaChatMessages).where(eq(ideaChatMessages.threadId, threadId)).orderBy(ideaChatMessages.createdAt);
}

export async function createChatMessage(userId: number, ideaId: number, role: "user" | "assistant", content: string, model?: string, threadId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  let currentThreadId = threadId;
  if (!currentThreadId) {
    const created = await db.insert(ideaChatThreads).values({ userId, ideaId, title: "Idea analysis" });
    currentThreadId = Number(created[0]?.insertId);
  }
  await db.insert(ideaChatMessages).values({ threadId: currentThreadId, role, content, model });
  return { threadId: currentThreadId };
}

export async function getIdeasForComparison(ids: number[]) {
  const db = await getDb();
  if (!db || ids.length < 2) return [];
  const rows = await db.select().from(ideas).where(inArray(ideas.id, ids));
  const ordered = ids.map(id => rows.find(row => row.id === id)).filter((row): row is typeof rows[number] => Boolean(row));
  return Promise.all(ordered.map(async idea => ({ ...idea, competitors: await db.select().from(competitors).where(eq(competitors.ideaId, idea.id)) })));
}

export async function createBatchJob(userId: number, urls: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const normalized = Array.from(new Set(urls.map(url => url.trim()).filter(Boolean)));
  if (!normalized.length) throw new Error("At least one store URL is required");
  const inserted = await db.insert(batchJobs).values({ userId, totalCount: normalized.length, status: "processing" });
  const batchId = Number(inserted[0]?.insertId);
  if (!batchId) throw new Error("Batch job could not be created");
  await db.insert(batchJobItems).values(normalized.map(sourceUrl => ({ batchId, sourceUrl })));
  
  // Eagerly process items server-side so batch imports run reliably even if the client view changes
  let currentJob = await getBatchJob(userId, batchId);
  while (currentJob && currentJob.items.some(item => item.status === "pending")) {
    await processNextBatchItem(userId, batchId);
    currentJob = await getBatchJob(userId, batchId);
  }
  return currentJob ?? getBatchJob(userId, batchId);
}

export async function listBatchJobs(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(batchJobs).where(eq(batchJobs.userId, userId)).orderBy(desc(batchJobs.updatedAt)).limit(20);
}

export async function getBatchJob(userId: number, batchId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const job = (await db.select().from(batchJobs).where(and(eq(batchJobs.id, batchId), eq(batchJobs.userId, userId))).limit(1))[0];
  if (!job) return undefined;
  const items = await db.select().from(batchJobItems).where(eq(batchJobItems.batchId, batchId)).orderBy(batchJobItems.id);
  return { ...job, items };
}

export async function processNextBatchItem(userId: number, batchId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const job = (await db.select().from(batchJobs).where(and(eq(batchJobs.id, batchId), eq(batchJobs.userId, userId))).limit(1))[0];
  if (!job) throw new Error("Batch job not found");
  const next = (await db.select().from(batchJobItems).where(and(eq(batchJobItems.batchId, batchId), eq(batchJobItems.status, "pending"))).orderBy(batchJobItems.id).limit(1))[0];
  if (!next) {
    await db.update(batchJobs).set({ status: job.failedCount ? "failed" : "completed", updatedAt: new Date() }).where(eq(batchJobs.id, batchId));
    return getBatchJob(userId, batchId);
  }
  await db.update(batchJobs).set({ status: "processing", updatedAt: new Date() }).where(eq(batchJobs.id, batchId));
  try {
    const result = await scrapeStoreApp(next.sourceUrl);
    const saved = await saveScrapedApp({ ...result, userId });
    await db.update(batchJobItems).set({ status: "success", scrapedAppId: saved.id }).where(eq(batchJobItems.id, next.id));
    await db.update(batchJobs).set({ successCount: job.successCount + 1, updatedAt: new Date() }).where(eq(batchJobs.id, batchId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to scrape this URL";
    await db.update(batchJobItems).set({ status: "error", errorMessage: message }).where(eq(batchJobItems.id, next.id));
    await db.update(batchJobs).set({ failedCount: job.failedCount + 1, updatedAt: new Date() }).where(eq(batchJobs.id, batchId));
  }
  const remaining = await db.select({ count: sql<number>`count(*)` }).from(batchJobItems).where(and(eq(batchJobItems.batchId, batchId), eq(batchJobItems.status, "pending")));
  if (Number(remaining[0]?.count ?? 0) === 0) {
    const latest = (await db.select().from(batchJobs).where(eq(batchJobs.id, batchId)).limit(1))[0];
    if (latest) await db.update(batchJobs).set({ status: latest.failedCount ? "failed" : "completed", updatedAt: new Date() }).where(eq(batchJobs.id, batchId));
  }
  return getBatchJob(userId, batchId);
}

const defaultPersonalWorkspace = {
  status: "Inbox" as const,
  validationChecklist: ["Define the problem in one sentence", "Interview 5 target users", "Review 3 direct competitors", "Test willingness to pay", "Choose build / park decision"],
  validationArtifacts: {},
  flutterBlueprint: {},
  financialModel: { price: 9, monthlyDownloads: 1000, conversionRate: 2, storeFee: 15, monthlyInfra: 50, monthlyAiCost: 20, monthlyMarketing: 0 },
  asoMetadata: { title: "", shortDescription: "", longDescription: "", keywords: [], releaseNotes: "" },
  backlogTasks: [],
};

export async function getPersonalWorkspace(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  let row = (await db.select().from(personalWorkspaces).where(eq(personalWorkspaces.userId, userId)).limit(1))[0];
  if (!row) {
    await db.insert(personalWorkspaces).values({ userId, ...defaultPersonalWorkspace });
    row = (await db.select().from(personalWorkspaces).where(eq(personalWorkspaces.userId, userId)).limit(1))[0];
  }
  return row;
}

export async function updatePersonalWorkspace(userId: number, patch: Record<string, unknown>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await getPersonalWorkspace(userId);
  await db.update(personalWorkspaces).set({ ...patch, updatedAt: new Date() }).where(eq(personalWorkspaces.userId, userId));
  return getPersonalWorkspace(userId);
}

export async function exportPersonalWorkspace(userId: number) {
  const workspace = await getPersonalWorkspace(userId);
  return { exportedAt: new Date().toISOString(), workspace };
}

export async function getPersonalDecision(userId: number) {
  const workspace = await getPersonalWorkspace(userId);
  if (!workspace) return undefined;
  const checklist = workspace.validationChecklist || [];
  const completed = checklist.filter(item => item.startsWith("✓ ")).length;
  const validationRatio = checklist.length ? completed / checklist.length : 0;
  const finance = (workspace.financialModel || {}) as Record<string, number>;
  const gross = (finance.monthlyDownloads || 0) * (finance.conversionRate || 0) / 100 * (finance.price || 0);
  const afterStoreFee = gross * (1 - (finance.storeFee || 0) / 100);
  const net = afterStoreFee - (finance.monthlyInfra || 0) - (finance.monthlyAiCost || 0) - (finance.monthlyMarketing || 0);
  const expenses = Math.max(1, (finance.monthlyInfra || 0) + (finance.monthlyAiCost || 0) + (finance.monthlyMarketing || 0));
  const financialScore = Math.max(0, Math.min(100, 50 + (net / expenses) * 50));
  const score = Math.round((workspace.customScore || 0) * 0.55 + validationRatio * 100 * 0.25 + financialScore * 0.2);
  const recommendation = score >= 75 && completed >= 3 && net >= 0 ? "Build a narrow MVP" : score >= 50 ? "Validate one assumption next" : "Keep in inbox";
  return { score, recommendation, completed, totalChecks: checklist.length, validationRatio, gross, afterStoreFee, net, financialScore };
}

export async function resetPersonalWorkspace(userId: number) {
  return updatePersonalWorkspace(userId, {
    status: defaultPersonalWorkspace.status,
    customNotes: "",
    customScore: 0,
    decisionLog: "",
    validationChecklist: defaultPersonalWorkspace.validationChecklist,
    validationArtifacts: defaultPersonalWorkspace.validationArtifacts,
    flutterBlueprint: defaultPersonalWorkspace.flutterBlueprint,
    financialModel: defaultPersonalWorkspace.financialModel,
    asoMetadata: defaultPersonalWorkspace.asoMetadata,
    backlogTasks: defaultPersonalWorkspace.backlogTasks,
  });
}

export { competitors, ideas, scrapedApps, scrapedAppReviews, scrapedAppScreenshots, openRouterSettings, ideaChatThreads, ideaChatMessages, batchJobs, batchJobItems, personalWorkspaces, competitorMonitors, competitorRatingHistory, keywordExplorers };

export async function listCompetitorMonitors(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(competitorMonitors).where(eq(competitorMonitors.userId, userId)).orderBy(desc(competitorMonitors.lastCheckedAt), desc(competitorMonitors.id));
}

export async function getCompetitorMonitor(userId: number, id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(competitorMonitors).where(and(eq(competitorMonitors.userId, userId), eq(competitorMonitors.id, id))).limit(1))[0];
}

export async function getCompetitorMonitorByTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(competitorMonitors).where(eq(competitorMonitors.scheduleCronTaskUid, taskUid)).limit(1))[0];
}

export async function createCompetitorMonitor(userId: number, payload: { appName: string; sourceUrl: string; store: "google_play" | "app_store" }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const inserted = await db.insert(competitorMonitors).values({ userId, appName: payload.appName.trim(), sourceUrl: payload.sourceUrl.trim(), store: payload.store });
  const id = Number(inserted[0]?.insertId);
  if (!id) throw new Error("Monitor could not be created");
  return getCompetitorMonitor(userId, id);
}

export async function setCompetitorMonitorSchedule(userId: number, id: number, taskUid: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(competitorMonitors).set({ scheduleCronTaskUid: taskUid }).where(and(eq(competitorMonitors.userId, userId), eq(competitorMonitors.id, id)));
  return getCompetitorMonitor(userId, id);
}

export async function deleteCompetitorMonitor(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(competitorMonitors).where(and(eq(competitorMonitors.userId, userId), eq(competitorMonitors.id, id)));
  return { deleted: true };
}

export async function recordCompetitorMonitorCheck(id: number, result: { name?: string; version?: string; rating?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const monitor = (await db.select().from(competitorMonitors).where(eq(competitorMonitors.id, id)).limit(1))[0];
  if (!monitor) throw new Error("Monitor not found");
  const changes: string[] = [];
  const hasBaseline = Boolean(monitor.lastVersion || monitor.lastRating);
  if (hasBaseline && monitor.lastVersion !== (result.version ?? null)) changes.push(`version ${monitor.lastVersion ?? "unknown"} → ${result.version ?? "unknown"}`);
  if (hasBaseline && monitor.lastRating !== (result.rating ?? null)) changes.push(`rating ${monitor.lastRating ?? "unknown"} → ${result.rating ?? "unknown"}`);
  const changed = changes.length > 0;
  const statusMessage = !hasBaseline ? "Baseline captured. Future checks will report version or rating changes." : changed ? `Detected changes: ${changes.join("; ")}` : "Checked successfully. No version or rating changes detected.";
  await db.update(competitorMonitors).set({ lastVersion: result.version ?? null, lastRating: result.rating ?? null, statusMessage, hasChanges: changed ? 1 : 0, lastCheckedAt: new Date() }).where(eq(competitorMonitors.id, id));
  if (result.rating) {
    await db.insert(competitorRatingHistory).values({ monitorId: id, userId: monitor.userId, rating: result.rating, capturedAt: new Date() });
  }
  return { monitor: await getCompetitorMonitor(monitor.userId, id), changed, changes, baselineCaptured: !hasBaseline, statusMessage };
}

export async function listKeywordExplorers(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(keywordExplorers).where(eq(keywordExplorers.userId, userId)).orderBy(desc(keywordExplorers.updatedAt), desc(keywordExplorers.id));
}

export async function listCompetitorRatingHistory(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    id: competitorRatingHistory.id,
    monitorId: competitorRatingHistory.monitorId,
    appName: competitorMonitors.appName,
    store: competitorMonitors.store,
    rating: competitorRatingHistory.rating,
    capturedAt: competitorRatingHistory.capturedAt,
  }).from(competitorRatingHistory).innerJoin(competitorMonitors, eq(competitorRatingHistory.monitorId, competitorMonitors.id)).where(eq(competitorRatingHistory.userId, userId)).orderBy(competitorRatingHistory.capturedAt);
  return rows;
}

export async function saveKeywordMarketingDescription(userId: number, keywordExplorerId: number, description: string, model: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = (await db.select().from(keywordExplorers).where(and(eq(keywordExplorers.id, keywordExplorerId), eq(keywordExplorers.userId, userId))).limit(1))[0];
  if (!existing) throw new Error("Keyword exploration not found");
  const generatedAt = new Date();
  await db.update(keywordExplorers).set({ marketingDescription: description, marketingModel: model, marketingGeneratedAt: generatedAt, updatedAt: generatedAt }).where(and(eq(keywordExplorers.id, keywordExplorerId), eq(keywordExplorers.userId, userId)));
  return (await db.select().from(keywordExplorers).where(eq(keywordExplorers.id, keywordExplorerId)).limit(1))[0];
}

export async function saveKeywordExplorer(userId: number, payload: { keyword: string; searchVolume?: number; difficulty?: number; cpiEstimate?: string | null; competitorCount?: number; notes?: string; analysis?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const keyword = payload.keyword.trim();
  const existing = (await db.select().from(keywordExplorers).where(and(eq(keywordExplorers.userId, userId), eq(keywordExplorers.keyword, keyword))).orderBy(desc(keywordExplorers.id)).limit(1))[0];
  const values = { keyword, searchVolume: payload.searchVolume ?? 0, difficulty: payload.difficulty ?? 0, cpiEstimate: payload.cpiEstimate ?? null, competitorCount: payload.competitorCount ?? 0, notes: payload.notes ?? null, analysis: payload.analysis ?? null };
  if (existing) {
    await db.update(keywordExplorers).set({ ...values, updatedAt: new Date() }).where(and(eq(keywordExplorers.userId, userId), eq(keywordExplorers.id, existing.id)));
    return (await db.select().from(keywordExplorers).where(eq(keywordExplorers.id, existing.id)).limit(1))[0];
  }
  const inserted = await db.insert(keywordExplorers).values({ userId, ...values });
  const id = Number(inserted[0]?.insertId);
  return id ? (await db.select().from(keywordExplorers).where(eq(keywordExplorers.id, id)).limit(1))[0] : undefined;
}

export async function getKeywordStoreSignals(userId: number, keyword: string) {
  const db = await getDb();
  if (!db) return { competitorCount: 0, examples: [] as string[] };
  const term = `%${keyword.trim()}%`;
  const matches = await db.select({ name: scrapedApps.name }).from(scrapedApps).where(and(eq(scrapedApps.userId, userId), or(like(scrapedApps.name, term), like(scrapedApps.description, term)))).orderBy(desc(scrapedApps.updatedAt)).limit(10);
  return { competitorCount: matches.length, examples: matches.map(item => item.name) };
}

export async function getKeywordExplorer(userId: number, id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(keywordExplorers).where(and(eq(keywordExplorers.userId, userId), eq(keywordExplorers.id, id))).limit(1))[0];
}
