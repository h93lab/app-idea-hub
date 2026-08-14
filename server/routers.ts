import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { parse as parseCookie } from "cookie";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { completeOpenRouter, listOpenRouterModels, maskApiKey } from "./openrouter";
import { parseStoreUrl, scrapeStoreApp } from "./scraper";
import { refreshCompetitorMonitor } from "./competitorMonitoring";
import { createHeartbeatJob, deleteHeartbeatJob, updateHeartbeatJob } from "./_core/heartbeat";
import { comparisonToMarkdown, ideaToMarkdown } from "./reports";
import { sdk } from "./_core/sdk";
import { upsertUser } from "./db";
import {
  createChatMessage,
  createBatchJob,
  ensureSeededIdeas,
  getIdeaDetail,
  getIdeaStats,
  getIdeasForComparison,
  getBatchJob,
  getOpenRouterSetting,
  getPersonalDecision,
  getPersonalWorkspace,
  getThreadMessages,
  listIdeas,
  listBatchJobs,
  listScrapedApps,
  saveOpenRouterSetting,
  processNextBatchItem,
  saveScrapedApp,
  updatePersonalWorkspace,
  exportPersonalWorkspace,
  resetPersonalWorkspace,
  listCompetitorMonitors,
  listCompetitorRatingHistory,
  getCompetitorMonitor,
  createCompetitorMonitor,
  setCompetitorMonitorSchedule,
  deleteCompetitorMonitor,
  recordCompetitorMonitorCheck,
  listKeywordExplorers,
  listMarketingDescriptionArchives,
  deleteMarketingDescriptionArchive,
  updateMarketingDescriptionArchive,
  getKeywordExplorer,
  saveKeywordExplorer,
  saveKeywordMarketingDescription,
  getKeywordStoreSignals,
} from "./db";

const category = z.enum(["Tools", "Health", "Education", "AI", "Games"]);
const monetizationModel = z.enum(["Subscription", "One-time", "Freemium", "Ads", "Usage-based", "Marketplace"]);
const competitionLevel = z.enum(["Low", "Medium", "High"]);

function requireDbResult<T>(value: T | undefined, message: string): T {
  if (!value) throw new TRPCError({ code: "NOT_FOUND", message });
  return value;
}

async function getConfiguredOpenRouter(userId: number) {
  const setting = await getOpenRouterSetting(userId);
  if (!setting?.apiKey || !setting.selectedModel) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Configure an OpenRouter API key and model first." });
  return setting;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    loginPin: publicProcedure.input(z.object({ pin: z.string() })).mutation(async ({ input, ctx }) => {
      if (input.pin !== "0566") {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid PIN code. Please use 0566." });
      }
      const openId = "pin_founder_0566";
      const name = "Personal Founder";
      await upsertUser({
        openId,
        name,
        email: "founder@appideahub.local",
        loginMethod: "pin",
        role: "admin",
        lastSignedIn: new Date(),
      });
      const sessionToken = await sdk.createSessionToken(openId, { name });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: 365 * 24 * 60 * 60 * 1000,
      });
      return { success: true, token: sessionToken } as const;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  dashboard: router({
    bootstrap: publicProcedure.query(async () => {
      await ensureSeededIdeas();
      return getIdeaStats();
    }),
    stats: publicProcedure.query(() => getIdeaStats()),
  }),
  ideas: router({
    compare: publicProcedure.input(z.object({ ids: z.array(z.number().int().positive()).min(2).max(4) })).query(async ({ input }) => {
      await ensureSeededIdeas();
      return getIdeasForComparison(input.ids);
    }),
    report: publicProcedure.input(z.object({ id: z.number().int().positive(), format: z.enum(["markdown", "pdf"]) })).query(async ({ input }) => {
      await ensureSeededIdeas();
      const idea = requireDbResult(await getIdeaDetail(input.id), "Idea not found");
      return { title: idea.title, markdown: ideaToMarkdown(idea), format: input.format };
    }),
    compareReport: publicProcedure.input(z.object({ ids: z.array(z.number().int().positive()).min(2).max(4), format: z.enum(["markdown", "pdf"]) })).query(async ({ input }) => {
      await ensureSeededIdeas();
      const selected = await getIdeasForComparison(input.ids);
      if (selected.length < 2) throw new TRPCError({ code: "NOT_FOUND", message: "Select at least two ideas" });
      return { title: "Idea comparison", markdown: comparisonToMarkdown(selected), format: input.format };
    }),
    list: publicProcedure.input(z.object({
      search: z.string().optional(), category: category.optional(), monetizationModel: monetizationModel.optional(), competitionLevel: competitionLevel.optional(), limit: z.number().int().min(1).max(100).default(50), offset: z.number().int().min(0).default(0),
    }).optional()).query(async ({ input }) => {
      await ensureSeededIdeas();
      return listIdeas(input ?? {});
    }),
    get: publicProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
      await ensureSeededIdeas();
      return requireDbResult(await getIdeaDetail(input.id), "Idea not found");
    }),
  }),
  personal: router({
    get: protectedProcedure.query(({ ctx }) => getPersonalWorkspace(ctx.user.id)),
    decision: protectedProcedure.query(({ ctx }) => getPersonalDecision(ctx.user.id)),
    generate: protectedProcedure.input(z.object({ brief: z.string().min(3).max(2000), mode: z.enum(["generate", "challenge", "market_gap", "keyword"]).default("generate") })).mutation(async ({ ctx, input }) => {
      const setting = await getOpenRouterSetting(ctx.user.id);
      if (!setting?.apiKey || !setting.selectedModel) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Configure OpenRouter in Settings first" });
      const instruction = input.mode === "challenge" ? "Act as a skeptical product strategist. Identify the riskiest assumptions, evidence gaps, likely failure modes, and the smallest validation test." : input.mode === "market_gap" ? "Act as a market-gap researcher. Extract underserved audiences, recurring complaints, missing workflows, and narrow wedges from the user's brief. Separate evidence requests from hypotheses." : input.mode === "keyword" ? "Act as an ASO researcher. Produce a keyword map with user intent, long-tail phrases, competitor language to study, and a practical store-listing experiment plan. Do not invent search volume." : "Generate five focused Android app or game opportunities. For each return title, audience, painful problem, narrow wedge, monetization, MVP in 14 days, and one reason it may fail.";
      const result = await completeOpenRouter({ apiKey: setting.apiKey, model: setting.selectedModel, messages: [{ role: "system", content: instruction }, { role: "user", content: input.brief }], temperature: 0.7 });
      return { content: result.content, model: result.model };
    }),
    validationGenerate: protectedProcedure.input(z.object({ type: z.enum(["landingCopy", "smokeTest"]), brief: z.string().min(3).max(2000) })).mutation(async ({ ctx, input }) => {
      const setting = await getOpenRouterSetting(ctx.user.id);
      if (!setting?.apiKey || !setting.selectedModel) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Configure OpenRouter in Settings first" });
      const system = input.type === "landingCopy" ? "Create a concise validation landing page draft for a solo app maker. Return a headline, subheadline, three outcome bullets, CTA, and a short trust note. Make claims testable and label assumptions." : "Create a smoke-test plan for a solo Android app maker. Return the hypothesis, audience, channel, experiment setup, success threshold, budget assumption, duration, and what decision follows. Do not invent market data.";
      const result = await completeOpenRouter({ apiKey: setting.apiKey, model: setting.selectedModel, messages: [{ role: "system", content: system }, { role: "user", content: input.brief }], temperature: 0.55 });
      const workspace = await getPersonalWorkspace(ctx.user.id);
      const artifacts = { ...(workspace?.validationArtifacts || {}), [input.type]: result.content, generatedAt: new Date().toISOString() };
      await updatePersonalWorkspace(ctx.user.id, { validationArtifacts: artifacts });
      return { ...result, artifacts };
    }),
    update: protectedProcedure.input(z.object({ patch: z.record(z.string(), z.unknown()) })).mutation(({ ctx, input }) => updatePersonalWorkspace(ctx.user.id, input.patch)),
    export: protectedProcedure.query(({ ctx }) => exportPersonalWorkspace(ctx.user.id)),
    reset: protectedProcedure.mutation(({ ctx }) => resetPersonalWorkspace(ctx.user.id)),
  }),
  monitors: router({
    list: protectedProcedure.query(({ ctx }) => listCompetitorMonitors(ctx.user.id)),
    ratingHistory: protectedProcedure.query(({ ctx }) => listCompetitorRatingHistory(ctx.user.id)),
    create: protectedProcedure.input(z.object({ appName: z.string().min(2).max(255), sourceUrl: z.string().url() })).mutation(async ({ ctx, input }) => {
      let parsed;
      try { parsed = parseStoreUrl(input.sourceUrl); } catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Use a valid store URL" }); }
      return createCompetitorMonitor(ctx.user.id, { appName: input.appName, sourceUrl: parsed.normalizedUrl, store: parsed.store });
    }),
    check: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const monitor = requireDbResult(await getCompetitorMonitor(ctx.user.id, input.id), "Monitor not found");
      try { return refreshCompetitorMonitor(monitor); } catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Unable to refresh competitor" }); }
    }),
    schedule: protectedProcedure.input(z.object({ id: z.number().int().positive(), cron: z.string().regex(/^\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+$/, "Use a six-field UTC cron expression") })).mutation(async ({ ctx, input }) => {
      const monitor = requireDbResult(await getCompetitorMonitor(ctx.user.id, input.id), "Monitor not found");
      if (monitor.scheduleCronTaskUid) throw new TRPCError({ code: "CONFLICT", message: "This monitor already has a schedule" });
      const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      if (!sessionToken) throw new TRPCError({ code: "UNAUTHORIZED", message: "A browser session cookie is required to create a background schedule" });
      const job = await createHeartbeatJob({ name: `competitor-monitor-${monitor.id}`, cron: input.cron, path: "/api/scheduled/competitor-monitor", payload: {}, description: `Refresh ${monitor.appName} and alert when its version or rating changes` }, sessionToken);
      return setCompetitorMonitorSchedule(ctx.user.id, monitor.id, job.taskUid);
    }),
    setEnabled: protectedProcedure.input(z.object({ id: z.number().int().positive(), enabled: z.boolean() })).mutation(async ({ ctx, input }) => {
      const monitor = requireDbResult(await getCompetitorMonitor(ctx.user.id, input.id), "Monitor not found");
      if (!monitor.scheduleCronTaskUid) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Schedule this monitor first" });
      const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      await updateHeartbeatJob(monitor.scheduleCronTaskUid, { enable: input.enabled }, sessionToken);
      return getCompetitorMonitor(ctx.user.id, monitor.id);
    }),
    removeSchedule: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const monitor = requireDbResult(await getCompetitorMonitor(ctx.user.id, input.id), "Monitor not found");
      if (monitor.scheduleCronTaskUid) {
        const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
        await deleteHeartbeatJob(monitor.scheduleCronTaskUid, sessionToken);
        await setCompetitorMonitorSchedule(ctx.user.id, monitor.id, null);
      }
      return getCompetitorMonitor(ctx.user.id, monitor.id);
    }),
    remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const monitor = requireDbResult(await getCompetitorMonitor(ctx.user.id, input.id), "Monitor not found");
      if (monitor.scheduleCronTaskUid) {
        const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
        await deleteHeartbeatJob(monitor.scheduleCronTaskUid, sessionToken);
      }
      return deleteCompetitorMonitor(ctx.user.id, monitor.id);
    }),
  }),
  keywords: router({
    list: protectedProcedure.query(({ ctx }) => listKeywordExplorers(ctx.user.id)),
    archives: protectedProcedure.query(({ ctx }) => listMarketingDescriptionArchives(ctx.user.id)),
    deleteArchive: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => deleteMarketingDescriptionArchive(ctx.user.id, input.id)),
    updateArchive: protectedProcedure.input(z.object({ id: z.number().int().positive(), description: z.string().min(10).max(10000) })).mutation(({ ctx, input }) => updateMarketingDescriptionArchive(ctx.user.id, input.id, input.description)),
    explore: protectedProcedure.input(z.object({ keyword: z.string().min(2).max(128), context: z.string().max(1000).optional() })).mutation(async ({ ctx, input }) => {
      const keyword = input.keyword.trim();
      const signals = await getKeywordStoreSignals(ctx.user.id, keyword);
      const difficulty = Math.min(100, 20 + signals.competitorCount * 10);
      const notes = `Heuristic only: ${signals.competitorCount} saved store listing match(es) for this keyword. Search volume, CPI, and store ranking data are not connected.`;
      const setting = await getOpenRouterSetting(ctx.user.id);
      let analysis = "Configure OpenRouter in Settings to generate a model-assisted ASO brief. The deterministic signals above are still saved.";
      let model: string | null = null;
      if (setting?.apiKey && setting.selectedModel) {
        const response = await completeOpenRouter({ apiKey: setting.apiKey, model: setting.selectedModel, temperature: 0.35, messages: [
          { role: "system", content: "You are a rigorous ASO strategist for a solo Flutter developer. Analyze intent, long-tail variations, title and short-description experiments, and validation steps. Never invent search volume, CPI, rankings, ratings, reviews, or market facts. Clearly label hypotheses and state when data is unavailable. Return concise markdown." },
          { role: "user", content: `Keyword: ${keyword}\nSaved listing matches: ${signals.competitorCount}\nMatched listing examples: ${signals.examples.join(", ") || "none"}\nDeveloper context: ${input.context || "solo Android/Flutter app developer"}` },
        ] });
        analysis = response.content;
        model = response.model;
      }
      const saved = await saveKeywordExplorer(ctx.user.id, { keyword, difficulty, competitorCount: signals.competitorCount, notes, analysis });
      return { record: saved, keyword, searchVolume: null, cpiEstimate: null, difficulty, competitorCount: signals.competitorCount, matchedApps: signals.examples, analysis, model, dataQuality: "Search-volume and CPI metrics require a connected ASO data source; no values are fabricated." };
    }),
    generateMarketingDescriptionDraft: protectedProcedure.input(z.object({ keywordExplorerId: z.number().int().positive(), appName: z.string().min(2).max(160), audience: z.string().min(2).max(500), tone: z.enum(["professional", "friendly", "bold", "minimal"]).default("professional"), language: z.enum(["English", "Arabic", "Bilingual"]).default("English") })).mutation(async ({ ctx, input }) => {
      const exploration = requireDbResult(await getKeywordExplorer(ctx.user.id, input.keywordExplorerId), "Keyword exploration not found");
      const setting = await getConfiguredOpenRouter(ctx.user.id);
      const response = await completeOpenRouter({ apiKey: setting.apiKey, model: setting.selectedModel, temperature: 0.65, messages: [
        { role: "system", content: "You are a mobile app marketing copywriter. Write a clear, differentiated store-ready marketing description using the supplied keyword naturally. Do not invent ratings, downloads, awards, testimonials, customer results, or market statistics. Label any product promise as a positioning hypothesis. Return markdown with a short headline, a 100-150 word description, three benefit bullets, and one CTA. Respect the requested language and tone." },
        { role: "user", content: `App name: ${input.appName}\nAudience: ${input.audience}\nTone: ${input.tone}\nLanguage: ${input.language}\nPrimary keyword: ${exploration.keyword}\nRelated saved listing matches: ${exploration.competitorCount}\nASO analysis: ${exploration.analysis || "No prior analysis"}` },
      ] });
      return { description: response.content, model: response.model, appName: input.appName, audience: input.audience, tone: input.tone, language: input.language, keywordExplorerId: input.keywordExplorerId };
    }),
    saveMarketingDescriptionDraft: protectedProcedure.input(z.object({ keywordExplorerId: z.number().int().positive(), appName: z.string().min(2).max(160), audience: z.string().min(2).max(500), tone: z.enum(["professional", "friendly", "bold", "minimal"]).default("professional"), language: z.enum(["English", "Arabic", "Bilingual"]).default("English"), description: z.string().min(10).max(10000), model: z.string() })).mutation(async ({ ctx, input }) => {
      const saved = await saveKeywordMarketingDescription(ctx.user.id, input.keywordExplorerId, { description: input.description, model: input.model, appName: input.appName, audience: input.audience, tone: input.tone, language: input.language });
      return { description: input.description, archive: saved.archive };
    }),
  }),
  scraper: router({
    list: protectedProcedure.query(({ ctx }) => listScrapedApps(ctx.user.id)),
    batchList: protectedProcedure.query(({ ctx }) => listBatchJobs(ctx.user.id)),
    batchGet: protectedProcedure.input(z.object({ batchId: z.number().int().positive() })).query(({ ctx, input }) => getBatchJob(ctx.user.id, input.batchId)),
    batchCreate: protectedProcedure.input(z.object({ sourceUrls: z.array(z.string().url()).min(1).max(50) })).mutation(({ ctx, input }) => createBatchJob(ctx.user.id, input.sourceUrls)),
    batchProcessNext: protectedProcedure.input(z.object({ batchId: z.number().int().positive() })).mutation(({ ctx, input }) => processNextBatchItem(ctx.user.id, input.batchId)),
    scrape: protectedProcedure.input(z.object({ sourceUrl: z.string().url() })).mutation(async ({ ctx, input }) => {
      try {
        const result = await scrapeStoreApp(input.sourceUrl);
        const saved = await saveScrapedApp({ ...result, userId: ctx.user.id });
        return { ...saved, screenshotsCount: result.screenshots.length, reviewsCount: result.reviews.length };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to scrape this store URL";
        throw new TRPCError({ code: "BAD_REQUEST", message });
      }
    }),
  }),
  ai: router({
    settings: protectedProcedure.query(async ({ ctx }) => {
      const setting = await getOpenRouterSetting(ctx.user.id);
      return setting ? { selectedModel: setting.selectedModel, modelLabel: setting.modelLabel, maskedApiKey: maskApiKey(setting.apiKey), configured: true } : { selectedModel: "", modelLabel: "", maskedApiKey: "", configured: false };
    }),
    saveSettings: protectedProcedure.input(z.object({ apiKey: z.string().min(10).optional(), selectedModel: z.string().min(2), modelLabel: z.string().max(300).optional() })).mutation(async ({ ctx, input }) => {
      const current = await getOpenRouterSetting(ctx.user.id);
      if (!input.apiKey?.trim() && !current?.apiKey) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "An OpenRouter API key is required." });
      const saved = await saveOpenRouterSetting(ctx.user.id, input.apiKey?.trim(), input.selectedModel.trim(), input.modelLabel?.trim());
      return saved ? { selectedModel: saved.selectedModel, modelLabel: saved.modelLabel, maskedApiKey: maskApiKey(saved.apiKey), configured: true } : { selectedModel: input.selectedModel, modelLabel: input.modelLabel, maskedApiKey: input.apiKey ? maskApiKey(input.apiKey) : "••••••••", configured: true };
    }),
    models: protectedProcedure.input(z.object({ apiKey: z.string().min(10).optional() }).optional()).query(async ({ ctx, input }) => {
      const setting = await getOpenRouterSetting(ctx.user.id);
      const apiKey = input?.apiKey?.trim() || setting?.apiKey;
      if (!apiKey) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Enter an OpenRouter API key to load models." });
      try {
        return listOpenRouterModels(apiKey);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load OpenRouter models";
        throw new TRPCError({ code: "BAD_REQUEST", message });
      }
    }),
    history: protectedProcedure.input(z.object({ threadId: z.number().int().positive() })).query(({ ctx, input }) => getThreadMessages(ctx.user.id, input.threadId)),
    chat: protectedProcedure.input(z.object({ ideaId: z.number().int().positive(), prompt: z.string().min(1).max(12000), threadId: z.number().int().positive().optional() })).mutation(async ({ ctx, input }) => {
      const setting = await getConfiguredOpenRouter(ctx.user.id);
      const idea = requireDbResult(await getIdeaDetail(input.ideaId), "Idea not found");
      const userMessage = await createChatMessage(ctx.user.id, input.ideaId, "user", input.prompt, setting.selectedModel, input.threadId);
      const history = await getThreadMessages(ctx.user.id, userMessage.threadId);
      const messages = [
        { role: "system" as const, content: `You are the product strategist inside App Idea Hub. Analyze the following idea carefully and answer with practical, concise markdown. Do not invent customer reviews or market facts. Clearly label assumptions. Idea: ${JSON.stringify({ title: idea.title, category: idea.category, summary: idea.summary, audience: idea.targetAudience, problem: idea.problem, solution: idea.solution, monetization: idea.monetizationModel, competitors: idea.competitors.map(item => ({ name: item.name, strengths: item.strengths, weaknesses: item.weaknesses })) })}` },
        ...history.map(message => ({ role: message.role as "user" | "assistant", content: message.content })),
      ];
      const response = await completeOpenRouter({ apiKey: setting.apiKey, model: setting.selectedModel, messages });
      await createChatMessage(ctx.user.id, input.ideaId, "assistant", response.content, response.model, userMessage.threadId);
      return { threadId: userMessage.threadId, content: response.content, model: response.model };
    }),
    analyzeIdea: protectedProcedure.input(z.object({ ideaId: z.number().int().positive(), focus: z.string().max(2000).optional() })).mutation(async ({ ctx, input }) => {
      const setting = await getConfiguredOpenRouter(ctx.user.id);
      const idea = requireDbResult(await getIdeaDetail(input.ideaId), "Idea not found");
      const prompt = `Produce a decision-ready analysis for this idea. Cover: target-user pain evidence to validate, MVP scope, acquisition channels, competitor gaps, differentiation, pricing test, risks, and a 14-day validation plan. Focus: ${input.focus ?? "overall feasibility"}.`;
      const response = await completeOpenRouter({ apiKey: setting.apiKey, model: setting.selectedModel, messages: [
        { role: "system", content: "You are a rigorous mobile product analyst. Use markdown headings and tables. Separate facts from hypotheses. Never fabricate ratings, testimonials, or customer evidence." },
        { role: "user", content: `${prompt}\n\nIdea record:\n${JSON.stringify(idea)}` },
      ] });
      const thread = await createChatMessage(ctx.user.id, idea.id, "assistant", response.content, response.model);
      return { threadId: thread.threadId, content: response.content, model: response.model };
    }),
  }),
  professionalTools: router({
    reviewIntelligence: protectedProcedure.input(z.object({ appName: z.string(), reviewsText: z.string().max(10000), evidenceNotes: z.string().max(4000).optional() })).mutation(async ({ ctx, input }) => {
      const setting = await getConfiguredOpenRouter(ctx.user.id);
      const res = await completeOpenRouter({
        apiKey: setting.apiKey,
        model: setting.selectedModel,
        messages: [
          { role: "system", content: "Analyze the provided app reviews and extract recurring complaints, missing features, and positive sentiments. Return valid JSON only with keys: complaints (array of strings), features (array of strings), sentimentRatio (number 0-100), and summary (string)." },
          { role: "user", content: `App: ${input.appName}\nReviews:\n${input.reviewsText}\nResearcher evidence notes:\n${input.evidenceNotes || "None provided"}` }
        ],
      });
      let data;
      try {
        const clean = res.content.replace(/```json/g, "").replace(/```/g, "").trim();
        data = JSON.parse(clean);
      } catch (e) {
        data = { complaints: ["Parsing error from LLM response"], features: [], sentimentRatio: 50, summary: res.content };
      }
      data.evidenceNotes = input.evidenceNotes || "";
      await updatePersonalWorkspace(ctx.user.id, { reviewIntelligence: data });
      return data;
    }),
    opportunityScore: protectedProcedure.input(z.object({ marketDemand: z.number(), competitionScore: z.number(), monetizationScore: z.number(), flutterFeasibility: z.number(), personalFit: z.number(), notes: z.string().optional() })).mutation(async ({ ctx, input }) => {
      await updatePersonalWorkspace(ctx.user.id, { opportunityScoring: input });
      return input;
    }),
    save: protectedProcedure.input(z.object({ key: z.enum(["opportunityScoring", "competitorGapMatrix", "asoRankTracker", "monetizationLab", "validationExperiments", "buildEstimator", "claudeCodeMission", "qaLab", "launchReadiness", "trendRadar", "evidenceVault", "ideaPortfolio", "postLaunchLearning"]), value: z.record(z.string(), z.unknown()) })).mutation(async ({ ctx, input }) => {
      await updatePersonalWorkspace(ctx.user.id, { [input.key]: input.value });
      return { key: input.key, value: input.value };
    }),
    claudeCodeGenerator: protectedProcedure.input(z.object({ projectTitle: z.string(), architectureBrief: z.string() })).mutation(async ({ ctx, input }) => {
      const setting = await getConfiguredOpenRouter(ctx.user.id);
      const res = await completeOpenRouter({
        apiKey: setting.apiKey,
        model: setting.selectedModel,
        messages: [
          { role: "system", content: "Act as an expert Flutter and Claude Code prompt engineer. Generate a comprehensive PRD and step-by-step developer prompt guide for building the Flutter app with Claude Code. Return valid JSON only with keys: promptSummary (string), instructions (string), prdStatus (string)." },
          { role: "user", content: `Project: ${input.projectTitle}\nBrief: ${input.architectureBrief}` }
        ],
      });
      let data;
      try {
        const clean = res.content.replace(/```json/g, "").replace(/```/g, "").trim();
        data = JSON.parse(clean);
      } catch (e) {
        data = { promptSummary: input.projectTitle, instructions: res.content, prdStatus: "Draft" };
      }
      await updatePersonalWorkspace(ctx.user.id, { claudeCodeMission: data });
      return data;
    }),
  }),
});

export type AppRouter = typeof appRouter;
