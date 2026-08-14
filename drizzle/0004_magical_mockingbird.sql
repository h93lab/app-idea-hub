CREATE TABLE `personalWorkspaces` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`status` enum('Inbox','Researching','Validating','Building','Live','Parked','Rejected') NOT NULL DEFAULT 'Inbox',
	`ideaId` int,
	`customNotes` text,
	`customScore` int,
	`decisionLog` text,
	`validationChecklist` json NOT NULL,
	`flutterBlueprint` json NOT NULL,
	`financialModel` json NOT NULL,
	`asoMetadata` json NOT NULL,
	`backlogTasks` json NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `personalWorkspaces_id` PRIMARY KEY(`id`),
	CONSTRAINT `personalWorkspaces_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE INDEX `personal_workspaces_user_idx` ON `personalWorkspaces` (`userId`);