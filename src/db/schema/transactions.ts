import { pgTable, text, timestamp, real } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { users } from './users.js';

export const transactions = pgTable('transactions', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  rawText: text('raw_text').notNull(),
  date: timestamp('date').notNull(),
  name: text('name'),
  type: text('type').notNull(), // 'income' or 'expense'
  amount: real('amount').notNull(),
  userId: text('user_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Export types for TypeScript
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
