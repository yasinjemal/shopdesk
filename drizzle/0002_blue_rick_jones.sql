ALTER TABLE `product_photos` ADD `source_key` text;--> statement-breakpoint
ALTER TABLE `product_photos` ADD `credit` text;--> statement-breakpoint
CREATE INDEX `idx_product_photos_source` ON `product_photos` (`owner`,`source_key`);