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
}, table => [index('idx_product_photos_owner').on(table.owner)]);
