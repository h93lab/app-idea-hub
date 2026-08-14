import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { completeOpenRouter, listOpenRouterModels, maskApiKey } from "./openrouter";
import { scrapeStoreApp } from "./scraper";
import { comparisonToMarkdown, ideaToMarkdown } from "./reports";
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
});

export type AppRouter = typeof appRouter;
