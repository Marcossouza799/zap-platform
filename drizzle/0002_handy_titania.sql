CREATE TABLE `flow_dispatches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`flowId` int NOT NULL,
	`flowName` varchar(255) NOT NULL,
	`tags` json DEFAULT ('[]'),
	`totalContacts` int NOT NULL DEFAULT 0,
	`status` enum('pending','running','done','failed') NOT NULL DEFAULT 'done',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `flow_dispatches_id` PRIMARY KEY(`id`)
);
