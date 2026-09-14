CREATE TABLE `product_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`mime` text NOT NULL,
	`bytes` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_product_photos_owner` ON `product_photos` (`owner`);--> statement-breakpoint
CREATE TABLE `poster_workspaces` (
	`owner` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
