import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  notifyOwner: vi.fn(),
  getCompetitorMonitorByTaskUid: vi.fn(),
  recordCompetitorMonitorCheck: vi.fn(),
  scrapeStoreApp: vi.fn(),
}));

vi.mock("./_core/notification", () => ({ notifyOwner: mocks.notifyOwner }));
vi.mock("./db", () => ({ getCompetitorMonitorByTaskUid: mocks.getCompetitorMonitorByTaskUid, recordCompetitorMonitorCheck: mocks.recordCompetitorMonitorCheck }));
vi.mock("./scraper", () => ({ scrapeStoreApp: mocks.scrapeStoreApp }));

import { refreshCompetitorMonitor, refreshCompetitorMonitorByTaskUid } from "./competitorMonitoring";

const monitor = { id: 4, userId: 7, appName: "Tracked app", sourceUrl: "https://play.google.com/store/apps/details?id=com.tracked", store: "google_play", lastVersion: "1.0", lastRating: "4.0", statusMessage: null, hasChanges: 0, scheduleCronTaskUid: "task-4", lastCheckedAt: new Date(), createdAt: new Date() } as any;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.scrapeStoreApp.mockResolvedValue({ store: "google_play", name: "Tracked app", version: "1.1", rating: "4.1" });
  mocks.recordCompetitorMonitorCheck.mockResolvedValue({ changed: true, baselineCaptured: false, statusMessage: "Detected changes: version 1.0 → 1.1", monitor });
  mocks.notifyOwner.mockResolvedValue(true);
});

describe("competitor monitoring", () => {
  it("scrapes the listing and notifies only after a detected change", async () => {
    const result = await refreshCompetitorMonitor(monitor);
    expect(mocks.scrapeStoreApp).toHaveBeenCalledWith(monitor.sourceUrl);
    expect(mocks.recordCompetitorMonitorCheck).toHaveBeenCalledWith(4, { name: "Tracked app", version: "1.1", rating: "4.1" });
    expect(mocks.notifyOwner).toHaveBeenCalledWith(expect.objectContaining({ title: "Competitor changed: Tracked app" }));
    expect(result.notificationSent).toBe(true);
  });

  it("returns an idempotent orphan result when a cron task no longer has a monitor", async () => {
    mocks.getCompetitorMonitorByTaskUid.mockResolvedValue(undefined);
    const result = await refreshCompetitorMonitorByTaskUid("missing-task");
    expect(result).toEqual({ skipped: "orphan" });
    expect(mocks.scrapeStoreApp).not.toHaveBeenCalled();
    expect(mocks.notifyOwner).not.toHaveBeenCalled();
  });
});
