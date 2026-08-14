CREATE TABLE `marketing_description_archives` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`keywordExplorerId` int,
	`appName` varchar(220) NOT NULL,
	`audience` varchar(300) NOT NULL,
	`keyword` varchar(128) NOT NULL,
	`tone` varchar(40) NOT NULL,
	`language` varchar(40) NOT NULL,
	`description` text NOT NULL,
	`model` varchar(220) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `marketing_description_archives_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `marketing_description_archives_user_idx` ON `marketing_description_archives` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `marketing_description_archives_keyword_idx` ON `marketing_description_archives` (`keywordExplorerId`);