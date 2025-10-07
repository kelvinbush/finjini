import { relations } from 'drizzle-orm';
import { users, transactions } from "./schema";

// Define user relations
export const usersRelations = relations(users, ({ many }) => ({
  transactions: many(transactions),
}));

// Define transaction relations
export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
}));
