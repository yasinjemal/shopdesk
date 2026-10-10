import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const workspaces = sqliteTable('poster_workspaces', {
  owner: text('owner').primaryKey(),
  data: text('data').notNull(),
  revision: integer('revision').notNull().default(1),
  updatedAt: text('updated_at').notNull(),
});

export const photos = sqliteTable('product_photos', {
  id: text('id').primaryKey(),
  owner: text('owner').notNull(),
  mime: text('mime').notNull(),
  bytes: integer('bytes').notNull(),
  createdAt: text('created_at').notNull(),
  // Catalogue photos: where the picture came from and the credit it carries.
  sourceKey: text('source_key'),
  credit: text('credit'),
}, table => [index('idx_product_photos_owner').on(table.owner), index('idx_product_photos_source').on(table.owner, table.sourceKey)]);

export const templates = sqliteTable('shared_templates', {
  id: text('id').primaryKey(),
  owner: text('owner').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  business: text('business').notNull(),
  data: text('data').notNull(),
  listed: integer('listed').notNull().default(1),
  createdAt: text('created_at').notNull(),
}, table => [index('idx_shared_templates_owner').on(table.owner),index('idx_shared_templates_listing').on(table.listed,table.createdAt,table.id)]);
