CREATE TABLE `competitors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ideaId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`platform` varchar(80) NOT NULL,
	`url` varchar(500),
	`positioning` text NOT NULL,
	`strengths` text NOT NULL,
	`weaknesses` text NOT NULL,
	`differentiation` text NOT NULL,
	`monetization` text NOT NULL,
	`threatLevel` enum('Low','Medium','High') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `competitors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ideaChatMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`threadId` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`model` varchar(220),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ideaChatMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ideaChatThreads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`ideaId` int NOT NULL,
	`title` varchar(220) NOT NULL DEFAULT 'Idea analysis',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ideaChatThreads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ideas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(180) NOT NULL,
	`title` varchar(220) NOT NULL,
	`category` enum('Tools','Health','Education','AI','Games') NOT NULL,
	`subcategory` varchar(120) NOT NULL,
	`summary` text NOT NULL,
	`targetAudience` text NOT NULL,
	`problem` text NOT NULL,
	`solution` text NOT NULL,
	`uniqueValue` text NOT NULL,
	`monetizationModel` enum('Subscription','One-time','Freemium','Ads','Usage-based','Marketplace') NOT NULL,
	`competitionLevel` enum('Low','Medium','High') NOT NULL,
	`competitionScore` int NOT NULL,
	`revenuePotential` enum('Moderate','Strong','Very strong') NOT NULL,
	`mvpScope` text NOT NULL,
	`implementationPlan` text NOT NULL,
	`validationPlan` text NOT NULL,
	`risks` text NOT NULL,
	`tags` json NOT NULL,
	`isSeeded` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ideas_id` PRIMARY KEY(`id`),
	CONSTRAINT `ideas_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `openRouterSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`apiKey` text NOT NULL,
	`selectedModel` varchar(220) NOT NULL,
	`modelLabel` varchar(300),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `openRouterSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `openRouterSettings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `scrapedAppReviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`appId` int NOT NULL,
	`author` varchar(220),
	`rating` int,
	`title` varchar(500),
	`content` text NOT NULL,
	`reviewDate` varchar(100),
	`version` varchar(80),
	`rawData` json,
	CONSTRAINT `scrapedAppReviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scrapedAppScreenshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`appId` int NOT NULL,
	`sourceUrl` varchar(1200) NOT NULL,
	`storageKey` varchar(700),
	`storageUrl` varchar(1000),
	`sortOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `scrapedAppScreenshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scrapedApps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`store` enum('google_play','app_store') NOT NULL,
	`sourceUrl` varchar(700) NOT NULL,
	`externalId` varchar(220) NOT NULL,
	`name` varchar(300) NOT NULL,
	`developer` varchar(300),
	`description` text,
	`iconUrl` varchar(1000),
	`rating` varchar(30),
	`ratingsCount` int,
	`version` varchar(80),
	`category` varchar(180),
	`price` varchar(80),
	`rawData` json,
	`scrapedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scrapedApps_id` PRIMARY KEY(`id`),
	CONSTRAINT `scraped_apps_source_idx` UNIQUE(`userId`,`store`,`externalId`)
);
--> statement-breakpoint
CREATE INDEX `competitors_idea_idx` ON `competitors` (`ideaId`);--> statement-breakpoint
CREATE INDEX `idea_chat_messages_thread_idx` ON `ideaChatMessages` (`threadId`);--> statement-breakpoint
CREATE INDEX `idea_chat_threads_idea_user_idx` ON `ideaChatThreads` (`ideaId`,`userId`);--> statement-breakpoint
CREATE INDEX `ideas_category_idx` ON `ideas` (`category`);--> statement-breakpoint
CREATE INDEX `ideas_model_idx` ON `ideas` (`monetizationModel`);--> statement-breakpoint
CREATE INDEX `ideas_competition_idx` ON `ideas` (`competitionLevel`);--> statement-breakpoint
CREATE INDEX `scraped_reviews_app_idx` ON `scrapedAppReviews` (`appId`);--> statement-breakpoint
CREATE INDEX `scraped_screenshots_app_idx` ON `scrapedAppScreenshots` (`appId`);--> statement-breakpoint
CREATE INDEX `scraped_apps_user_idx` ON `scrapedApps` (`userId`);