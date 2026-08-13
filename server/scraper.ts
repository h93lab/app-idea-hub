import gplay from "google-play-scraper";
import appStore from "app-store-scraper";
import type { ScrapedStore } from "../drizzle/schema";

export type ParsedStoreUrl = { store: ScrapedStore; externalId: string; normalizedUrl: string };

export type ScrapeResult = {
  store: ScrapedStore; externalId: string; sourceUrl: string; name: string;
  developer?: string; description?: string; iconUrl?: string; rating?: string; reviewStatus: "ok" | "unavailable";
  ratingsCount?: number; version?: string; category?: string; price?: string;
  screenshots: string[];
  reviews: Array<{ author?: string; rating?: number; title?: string; content: string; reviewDate?: string; version?: string; rawData?: Record<string, unknown> }>;
  rawData: Record<string, unknown>;
};

export function parseStoreUrl(sourceUrl: string): ParsedStoreUrl {
  const url = new URL(sourceUrl.trim());
  const playId = url.searchParams.get("id");
  if (url.hostname === "play.google.com" && url.pathname.includes("/store/apps") && playId) {
    return { store: "google_play", externalId: playId, normalizedUrl: `https://play.google.com/store/apps/details?id=${encodeURIComponent(playId)}` };
  }
  const appId = url.pathname.match(/\/id(\d+)/)?.[1];
  if (url.hostname === "apps.apple.com" && appId) {
    return { store: "app_store", externalId: appId, normalizedUrl: `https://apps.apple.com/app/id${appId}` };
  }
  throw new Error("Use a valid Google Play or Apple App Store URL");
}

function safeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
function safeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

async function scrapeGooglePlay(parsed: ParsedStoreUrl, sourceUrl: string): Promise<ScrapeResult> {
  const app: any = await (gplay as any).app({ appId: parsed.externalId, lang: "en", country: "us" });
  let reviews: any[] = [];
  let reviewStatus: "ok" | "unavailable" = "ok";
  try {
    const reviewResult = await (gplay as any).reviews({ appId: parsed.externalId, sort: (gplay as any).sort?.HELPFUL, num: 100, lang: "en", country: "us" });
    reviews = Array.isArray(reviewResult) ? reviewResult : reviewResult?.data ?? [];
  } catch { reviewStatus = "unavailable"; }
  return {
    store: "google_play", externalId: parsed.externalId, sourceUrl, name: app.title ?? parsed.externalId, reviewStatus,
    developer: safeString(app.developer), description: safeString(app.description), iconUrl: safeString(app.icon),
    rating: safeNumber(app.score)?.toFixed(2), ratingsCount: safeNumber(app.ratings), version: safeString(app.version),
    category: safeString(app.genre), price: app.price !== undefined ? String(app.price) : undefined,
    screenshots: Array.isArray(app.screenshots) ? app.screenshots.filter((item: unknown): item is string => typeof item === "string") : [],
    reviews: reviews.slice(0, 100).map(review => ({ author: safeString(review.userName), rating: safeNumber(review.score), content: safeString(review.text) ?? "", reviewDate: safeString(review.date), version: safeString(review.version), rawData: review })).filter(review => review.content),
    rawData: app,
  };
}

async function scrapeAppStore(parsed: ParsedStoreUrl, sourceUrl: string): Promise<ScrapeResult> {
  const app: any = await (appStore as any).app({ id: parsed.externalId, country: "us" });
  let reviews: any[] = [];
  let reviewStatus: "ok" | "unavailable" = "ok";
  try {
    reviews = await (appStore as any).reviews({ id: parsed.externalId, page: 1, sort: "helpful", country: "us" });
  } catch { reviewStatus = "unavailable"; }
  return {
    store: "app_store", externalId: parsed.externalId, sourceUrl, name: app.title ?? parsed.externalId, reviewStatus,
    developer: safeString(app.developer), description: safeString(app.description), iconUrl: safeString(app.icon),
    rating: safeNumber(app.score)?.toFixed(2), ratingsCount: safeNumber(app.ratings), version: safeString(app.version),
    category: Array.isArray(app.genres) ? app.genres.join(", ") : safeString(app.primaryGenre), price: app.price !== undefined ? String(app.price) : undefined,
    screenshots: Array.isArray(app.screenshots) ? app.screenshots.filter((item: unknown): item is string => typeof item === "string") : [],
    reviews: reviews.slice(0, 100).map(review => ({ author: safeString(review.userName), rating: safeNumber(review.rating), title: safeString(review.title), content: safeString(review.text) ?? "", reviewDate: safeString(review.updated), rawData: review })).filter(review => review.content),
    rawData: app,
  };
}

export async function scrapeStoreApp(sourceUrl: string): Promise<ScrapeResult> {
  const parsed = parseStoreUrl(sourceUrl);
  return parsed.store === "google_play" ? scrapeGooglePlay(parsed, sourceUrl) : scrapeAppStore(parsed, sourceUrl);
}
