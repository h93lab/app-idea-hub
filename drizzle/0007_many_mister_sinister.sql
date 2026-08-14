ALTER TABLE `competitor_monitors` ADD `schedule_cron_task_uid` varchar(65);--> statement-breakpoint
ALTER TABLE `keyword_explorers` ADD `analysis` text;--> statement-breakpoint
ALTER TABLE `keyword_explorers` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
CREATE INDEX `competitor_monitors_user_idx` ON `competitor_monitors` (`userId`);--> statement-breakpoint
CREATE INDEX `competitor_monitors_schedule_idx` ON `competitor_monitors` (`schedule_cron_task_uid`);--> statement-breakpoint
CREATE INDEX `keyword_explorers_user_idx` ON `keyword_explorers` (`userId`);