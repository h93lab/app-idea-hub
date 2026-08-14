export type RatingRange = "7d" | "30d" | "90d" | "all";

type TimestampedRow = { capturedAt: Date | string };

export function filterRatingHistoryByRange<T extends TimestampedRow>(rows: T[], range: RatingRange, now = Date.now()) {
  if (range === "all") return rows;
  const days = Number(range.replace("d", ""));
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  return rows.filter(item => new Date(item.capturedAt).getTime() >= cutoff);
}
