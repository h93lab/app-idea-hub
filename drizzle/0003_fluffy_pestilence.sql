CREATE TABLE `batchJobItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`batchId` int NOT NULL,
	`sourceUrl` varchar(700) NOT NULL,
	`status` enum('pending','success','error') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`scrapedAppId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `batchJobItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `batchJobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`totalCount` int NOT NULL,
	`successCount` int NOT NULL DEFAULT 0,
	`failedCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `batchJobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `batch_items_batch_idx` ON `batchJobItems` (`batchId`);--> statement-breakpoint
CREATE INDEX `batch_jobs_user_idx` ON `batchJobs` (`userId`);