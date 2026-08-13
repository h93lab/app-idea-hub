import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { completeOpenRouter, listOpenRouterModels, maskApiKey } from "./openrouter";
import { scrapeStoreApp } from "./scraper";
import {
  createChatMessage,
  ensureSeededIdeas,
  getIdeaDetail,
  getIdeaStats,
  getOpenRouterSetting,
  getThreadMessages,
  listIdeas,
  listScrapedApps,
  saveOpenRouterSetting,
  saveScrapedApp,
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
  scraper: router({
    list: protectedProcedure.query(({ ctx }) => listScrapedApps(ctx.user.id)),
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
