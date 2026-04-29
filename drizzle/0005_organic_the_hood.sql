CREATE TABLE `flow_execution_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`nodeId` varchar(64) NOT NULL,
	`nodeType` varchar(64) NOT NULL,
	`input` text DEFAULT (''),
	`output` text DEFAULT (''),
	`status` enum('ok','error','waiting') NOT NULL DEFAULT 'ok',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `flow_execution_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `flow_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`flowId` int NOT NULL,
	`contactId` int NOT NULL,
	`connectionId` int NOT NULL,
	`currentNodeId` varchar(64) DEFAULT '',
	`variables` json DEFAULT ('{}'),
	`status` enum('active','waiting','completed','error') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `flow_sessions_id` PRIMARY KEY(`id`)
);
