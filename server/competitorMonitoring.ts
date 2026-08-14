import type { CompetitorMonitor } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";
import { getCompetitorMonitorByTaskUid, recordCompetitorMonitorCheck } from "./db";
import { scrapeStoreApp } from "./scraper";

import { getOpenRouterSetting } from "./db";
import { completeOpenRouter } from "./openrouter";

export async function refreshCompetitorMonitor(monitor: CompetitorMonitor) {
  const result = await scrapeStoreApp(monitor.sourceUrl);
  const sentiment = await analyzeReviewSentimentAI(monitor.userId, result.reviews);
  const checked = await recordCompetitorMonitorCheck(monitor.id, {
    name: result.name,
    version: result.version,
    rating: result.rating,
    sentimentPositivePercent: sentiment.positivePercent,
    sentimentNegativePercent: sentiment.negativePercent,
    sentimentSummary: sentiment.summary,
  });

  let notificationSent = false;
  if (checked.changed) {
    notificationSent = await notifyOwner({
      title: `Competitor changed: ${result.name}`,
      content: `${checked.statusMessage}\n\nStore: ${result.store}\nListing: ${monitor.sourceUrl}`,
    });
  }

  return { ...checked, scraped: { name: result.name, version: result.version, rating: result.rating }, notificationSent };
}

export async function refreshCompetitorMonitorByTaskUid(taskUid: string) {
  const monitor = await getCompetitorMonitorByTaskUid(taskUid);
  if (!monitor) return { skipped: "orphan" as const };
  return refreshCompetitorMonitor(monitor);
}

export async function analyzeReviewSentimentAI(userId: number, reviews: Array<{ rating?: number; content: string }>) {
  if (!reviews || reviews.length === 0) {
    return { positivePercent: 50, negativePercent: 50, summary: "No store reviews available for sentiment analysis." };
  }
  const setting = await getOpenRouterSetting(userId);
  if (!setting?.apiKey || !setting.selectedModel) {
    let positive = 0;
    let negative = 0;
    for (const r of reviews) {
      if ((r.rating ?? 3) >= 4) positive++;
      else if ((r.rating ?? 3) <= 2) negative++;
    }
    const total = positive + negative || reviews.length;
    const pos = Math.round((positive / total) * 100);
    const neg = Math.round((negative / total) * 100);
    return { positivePercent: pos, negativePercent: neg, summary: `Heuristic fallback (${reviews.length} reviews): ${pos}% positive, ${neg}% negative.` };
  }
  const reviewTexts = reviews.slice(0, 30).map((r, i) => `${i + 1}. [Rating: ${r.rating ?? "N/A"}] ${r.content}`).join("\n");
  try {
    const response = await completeOpenRouter({
      apiKey: setting.apiKey,
      model: setting.selectedModel,
      temperature: 0.2,
      messages: [
        { role: "system", content: "You are an app store review sentiment analyzer. Analyze the provided reviews and return a JSON object with EXACT keys: positivePercent (integer 0-100), negativePercent (integer 0-100), summary (a concise 1-sentence sentiment breakdown in English)." },
        { role: "user", content: `Analyze these reviews:\n${reviewTexts}` }
      ],
    });
    const parsed = JSON.parse(response.content.replace(/```json|```/g, "").trim());
    return {
      positivePercent: typeof parsed.positivePercent === "number" ? parsed.positivePercent : 50,
      negativePercent: typeof parsed.negativePercent === "number" ? parsed.negativePercent : 50,
      summary: typeof parsed.summary === "string" ? parsed.summary : "AI sentiment analysis completed successfully.",
    };
  } catch {
    let positive = 0;
    let negative = 0;
    for (const r of reviews) {
      if ((r.rating ?? 3) >= 4) positive++;
      else if ((r.rating ?? 3) <= 2) negative++;
    }
    const total = positive + negative || reviews.length;
    const pos = Math.round((positive / total) * 100);
    const neg = Math.round((negative / total) * 100);
    return { positivePercent: pos, negativePercent: neg, summary: `AI parsing fallback (${reviews.length} reviews): ${pos}% positive, ${neg}% negative.` };
  }
}
