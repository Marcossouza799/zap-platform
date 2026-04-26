CREATE TABLE `contact_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contactId` int NOT NULL,
	`userId` int NOT NULL,
	`type` enum('created','flow','message_in','message_out','tag','note','status') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text DEFAULT (''),
	`metadata` json DEFAULT ('{}'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contact_events_id` PRIMARY KEY(`id`)
);
