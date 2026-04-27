CREATE TABLE `whatsapp_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('official','unofficial') NOT NULL,
	`status` enum('disconnected','connecting','connected','error') NOT NULL DEFAULT 'disconnected',
	`config` json DEFAULT ('{}'),
	`qrCode` text DEFAULT (''),
	`phone` varchar(32) DEFAULT '',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whatsapp_connections_id` PRIMARY KEY(`id`)
);
