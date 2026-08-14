CREATE TABLE `competitor_rating_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`monitorId` int NOT NULL,
	`userId` int NOT NULL,
	`rating` varchar(32) NOT NULL,
	`capturedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `competitor_rating_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `keyword_explorers` ADD `marketingDescription` text;--> statement-breakpoint
ALTER TABLE `keyword_explorers` ADD `marketingModel` varchar(220);--> statement-breakpoint
ALTER TABLE `keyword_explorers` ADD `marketingGeneratedAt` timestamp;--> statement-breakpoint
CREATE INDEX `competitor_rating_history_monitor_idx` ON `competitor_rating_history` (`monitorId`,`capturedAt`);--> statement-breakpoint
CREATE INDEX `competitor_rating_history_user_idx` ON `competitor_rating_history` (`userId`);