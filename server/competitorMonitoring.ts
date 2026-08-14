import type { CompetitorMonitor } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";
import { getCompetitorMonitorByTaskUid, recordCompetitorMonitorCheck } from "./db";
import { scrapeStoreApp } from "./scraper";

export async function refreshCompetitorMonitor(monitor: CompetitorMonitor) {
  const result = await scrapeStoreApp(monitor.sourceUrl);
  const checked = await recordCompetitorMonitorCheck(monitor.id, {
    name: result.name,
    version: result.version,
    rating: result.rating,
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
