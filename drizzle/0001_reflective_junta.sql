CREATE TABLE `shared_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`business` text NOT NULL,
	`data` text NOT NULL,
	`listed` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_shared_templates_owner` ON `shared_templates` (`owner`);--> statement-breakpoint
CREATE INDEX `idx_shared_templates_listing` ON `shared_templates` (`listed`,`created_at`,`id`);