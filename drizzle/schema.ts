import { boolean, index, int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const ideas = mysqlTable("ideas", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 180 }).notNull().unique(),
  title: varchar("title", { length: 220 }).notNull(),
  category: mysqlEnum("category", ["Tools", "Health", "Education", "AI", "Games"]).notNull(),
  subcategory: varchar("subcategory", { length: 120 }).notNull(),
  summary: text("summary").notNull(),
  targetAudience: text("targetAudience").notNull(),
  problem: text("problem").notNull(),
  solution: text("solution").notNull(),
  uniqueValue: text("uniqueValue").notNull(),
  monetizationModel: mysqlEnum("monetizationModel", ["Subscription", "One-time", "Freemium", "Ads", "Usage-based", "Marketplace"]).notNull(),
  competitionLevel: mysqlEnum("competitionLevel", ["Low", "Medium", "High"]).notNull(),
  competitionScore: int("competitionScore").notNull(),
  revenuePotential: mysqlEnum("revenuePotential", ["Moderate", "Strong", "Very strong"]).notNull(),
  mvpScope: text("mvpScope").notNull(),
  implementationPlan: text("implementationPlan").notNull(),
  validationPlan: text("validationPlan").notNull(),
  risks: text("risks").notNull(),
  tags: json("tags").$type<string[]>().notNull(),
  isSeeded: boolean("isSeeded").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  categoryIdx: index("ideas_category_idx").on(table.category),
  modelIdx: index("ideas_model_idx").on(table.monetizationModel),
  competitionIdx: index("ideas_competition_idx").on(table.competitionLevel),
}));

export const competitors = mysqlTable("competitors", {
  id: int("id").autoincrement().primaryKey(),
  ideaId: int("ideaId").notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  platform: varchar("platform", { length: 80 }).notNull(),
  url: varchar("url", { length: 500 }),
  positioning: text("positioning").notNull(),
  strengths: text("strengths").notNull(),
  weaknesses: text("weaknesses").notNull(),
  differentiation: text("differentiation").notNull(),
  monetization: text("monetization").notNull(),
  threatLevel: mysqlEnum("threatLevel", ["Low", "Medium", "High"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ ideaIdx: index("competitors_idea_idx").on(table.ideaId) }));

export const scrapedApps = mysqlTable("scrapedApps", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  store: mysqlEnum("store", ["google_play", "app_store"]).notNull(),
  sourceUrl: varchar("sourceUrl", { length: 700 }).notNull(),
  externalId: varchar("externalId", { length: 220 }).notNull(),
  name: varchar("name", { length: 300 }).notNull(),
  developer: varchar("developer", { length: 300 }),
  description: text("description"),
  iconUrl: varchar("iconUrl", { length: 1000 }),
  rating: varchar("rating", { length: 30 }),
  ratingsCount: int("ratingsCount"),
  version: varchar("version", { length: 80 }),
  category: varchar("category", { length: 180 }),
  price: varchar("price", { length: 80 }),
  reviewStatus: mysqlEnum("reviewStatus", ["ok", "unavailable"]).default("ok").notNull(),
  rawData: json("rawData").$type<Record<string, unknown>>(),
  scrapedAt: timestamp("scrapedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  userIdx: index("scraped_apps_user_idx").on(table.userId),
  sourceIdx: uniqueIndex("scraped_apps_source_idx").on(table.userId, table.store, table.externalId),
}));

export const scrapedAppScreenshots = mysqlTable("scrapedAppScreenshots", {
  id: int("id").autoincrement().primaryKey(),
  appId: int("appId").notNull(),
  sourceUrl: varchar("sourceUrl", { length: 1200 }).notNull(),
  storageKey: varchar("storageKey", { length: 700 }),
  storageUrl: varchar("storageUrl", { length: 1000 }),
  sortOrder: int("sortOrder").default(0).notNull(),
}, table => ({ appIdx: index("scraped_screenshots_app_idx").on(table.appId) }));

export const scrapedAppReviews = mysqlTable("scrapedAppReviews", {
  id: int("id").autoincrement().primaryKey(),
  appId: int("appId").notNull(),
  author: varchar("author", { length: 220 }),
  rating: int("rating"),
  title: varchar("title", { length: 500 }),
  content: text("content").notNull(),
  reviewDate: varchar("reviewDate", { length: 100 }),
  version: varchar("version", { length: 80 }),
  rawData: json("rawData").$type<Record<string, unknown>>(),
}, table => ({ appIdx: index("scraped_reviews_app_idx").on(table.appId) }));

export const openRouterSettings = mysqlTable("openRouterSettings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  apiKey: text("apiKey").notNull(),
  selectedModel: varchar("selectedModel", { length: 220 }).notNull(),
  modelLabel: varchar("modelLabel", { length: 300 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const ideaChatThreads = mysqlTable("ideaChatThreads", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  ideaId: int("ideaId").notNull(),
  title: varchar("title", { length: 220 }).default("Idea analysis").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ ideaUserIdx: index("idea_chat_threads_idea_user_idx").on(table.ideaId, table.userId) }));

export const ideaChatMessages = mysqlTable("ideaChatMessages", {
  id: int("id").autoincrement().primaryKey(),
  threadId: int("threadId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  model: varchar("model", { length: 220 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ threadIdx: index("idea_chat_messages_thread_idx").on(table.threadId) }));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Idea = typeof ideas.$inferSelect;
export type InsertIdea = typeof ideas.$inferInsert;
export type Competitor = typeof competitors.$inferSelect;
export type InsertCompetitor = typeof competitors.$inferInsert;
export type ScrapedApp = typeof scrapedApps.$inferSelect;
export type OpenRouterSetting = typeof openRouterSettings.$inferSelect;
export type IdeaChatMessage = typeof ideaChatMessages.$inferSelect;

export const categories = ["Tools", "Health", "Education", "AI", "Games"] as const;
export const monetizationModels = ["Subscription", "One-time", "Freemium", "Ads", "Usage-based", "Marketplace"] as const;
export const competitionLevels = ["Low", "Medium", "High"] as const;
export type IdeaCategory = (typeof categories)[number];
export type MonetizationModel = (typeof monetizationModels)[number];
export type CompetitionLevel = (typeof competitionLevels)[number];
export type ScrapedStore = "google_play" | "app_store";
export type IdeaWithCompetitors = Idea & { competitors: Competitor[] };
export const schemaVersion = "app-idea-hub-v1" as const;
export const seedDataVersion = "ideas-200-v1" as const;

export const batchJobs = mysqlTable("batchJobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  totalCount: int("totalCount").notNull(),
  successCount: int("successCount").default(0).notNull(),
  failedCount: int("failedCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ userIdx: index("batch_jobs_user_idx").on(table.userId) }));

export const batchJobItems = mysqlTable("batchJobItems", {
  id: int("id").autoincrement().primaryKey(),
  batchId: int("batchId").notNull(),
  sourceUrl: varchar("sourceUrl", { length: 700 }).notNull(),
  status: mysqlEnum("status", ["pending", "success", "error"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  scrapedAppId: int("scrapedAppId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ batchIdx: index("batch_items_batch_idx").on(table.batchId) }));

export type BatchJob = typeof batchJobs.$inferSelect;
export type BatchJobItem = typeof batchJobItems.$inferSelect;

export const personalWorkspaces = mysqlTable("personalWorkspaces", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  status: mysqlEnum("status", ["Inbox", "Researching", "Validating", "Building", "Live", "Parked", "Rejected"]).default("Inbox").notNull(),
  ideaId: int("ideaId"),
  customNotes: text("customNotes"),
  customScore: int("customScore"),
  decisionLog: text("decisionLog"),
  validationChecklist: json("validationChecklist").$type<string[]>().notNull(),
  validationArtifacts: json("validationArtifacts").$type<{ landingCopy?: string; smokeTest?: string; generatedAt?: string }>().notNull(),
  flutterBlueprint: json("flutterBlueprint").$type<Record<string, any>>().notNull(),
  financialModel: json("financialModel").$type<Record<string, any>>().notNull(),
  asoMetadata: json("asoMetadata").$type<Record<string, any>>().notNull(),
  backlogTasks: json("backlogTasks").$type<Array<{ id: string; title: string; status: "todo" | "in_progress" | "done"; hours: number }>>().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ userIdx: index("personal_workspaces_user_idx").on(table.userId) }));
