CREATE TABLE `contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`tags` json DEFAULT ('[]'),
	`status` enum('active','inactive','waiting') NOT NULL DEFAULT 'active',
	`currentFlow` varchar(255) DEFAULT '',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `flow_edges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`flowId` int NOT NULL,
	`edgeId` varchar(64) NOT NULL,
	`sourceNodeId` varchar(64) NOT NULL,
	`targetNodeId` varchar(64) NOT NULL,
	CONSTRAINT `flow_edges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `flow_nodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`flowId` int NOT NULL,
	`nodeId` varchar(64) NOT NULL,
	`type` varchar(64) NOT NULL,
	`label` varchar(255) NOT NULL,
	`subtitle` varchar(255) DEFAULT '',
	`x` int NOT NULL DEFAULT 0,
	`y` int NOT NULL DEFAULT 0,
	`bgColor` varchar(32) DEFAULT '#091c34',
	`textColor` varchar(32) DEFAULT '#378add',
	`config` json DEFAULT ('{}'),
	CONSTRAINT `flow_nodes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `flows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`status` enum('active','paused','draft') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `flows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kanban_cards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`columnId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(32) DEFAULT '',
	`tags` json DEFAULT ('[]'),
	`value` varchar(64) DEFAULT '',
	`position` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `kanban_cards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kanban_columns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`color` varchar(32) DEFAULT '#378add',
	`position` int NOT NULL DEFAULT 0,
	CONSTRAINT `kanban_columns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`contactId` int,
	`role` enum('user','assistant','system') NOT NULL,
	`content` text NOT NULL,
	`isAi` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
