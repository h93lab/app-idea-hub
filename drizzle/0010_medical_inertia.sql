ALTER TABLE `competitor_monitors` ADD `sentimentPositivePercent` int;--> statement-breakpoint
ALTER TABLE `competitor_monitors` ADD `sentimentNegativePercent` int;--> statement-breakpoint
ALTER TABLE `competitor_monitors` ADD `sentimentSummary` text;--> statement-breakpoint
ALTER TABLE `marketing_description_archives` ADD `isEdited` int DEFAULT 0 NOT NULL;