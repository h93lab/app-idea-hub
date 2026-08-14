CREATE TABLE `competitor_monitors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`appName` varchar(255) NOT NULL,
	`sourceUrl` text NOT NULL,
	`store` varchar(32) NOT NULL,
	`lastVersion` varchar(64),
	`lastRating` varchar(32),
	`statusMessage` text,
	`hasChanges` int NOT NULL DEFAULT 0,
	`lastCheckedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `competitor_monitors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `keyword_explorers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`keyword` varchar(128) NOT NULL,
	`searchVolume` int NOT NULL DEFAULT 0,
	`difficulty` int NOT NULL DEFAULT 0,
	`cpiEstimate` varchar(32),
	`competitorCount` int NOT NULL DEFAULT 0,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `keyword_explorers_id` PRIMARY KEY(`id`)
);
