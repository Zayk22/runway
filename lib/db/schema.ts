import {
  pgTable,
  pgEnum,
  text,
  integer,
  uuid,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

// ============================================
// ENUMS
// ============================================

export const transactionTypeEnum = pgEnum('transaction_type', [
  'income',
  'expense',
]);

// ============================================
// USERS
// Synced from Clerk. Created on first sign-in.
// ============================================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Clerk's user ID (e.g. "user_2abc123...")
  clerkUserId: text('clerk_user_id').notNull().unique(),

  email: text('email').notNull(),
  displayName: text('display_name'),

  // Monthly spending cap in kobo (₦1 = 100 kobo).
  // Null until the user completes onboarding.
  monthlyCap: integer('monthly_cap'),

  // ISO currency code. NGN by default.
  currency: text('currency').notNull().default('NGN'),

  // Reminder settings. Null = no reminder scheduled.
  reminderHour: integer('reminder_hour'), // 0–23, user's local hour
  reminderTimezone: text('reminder_timezone'), // IANA tz e.g. "Africa/Lagos"
  notificationsEnabled: boolean('notifications_enabled').notNull().default(true),
  lastNotifiedAt: timestamp('last_notified_at', { withTimezone: true }),

  onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ============================================
// TRANSACTIONS
// Parsed from CSV/PDF on the client, then sent here.
// ============================================

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    description: text('description').notNull(),

    // Always positive. Direction is determined by `type`.
    // Stored in kobo to avoid floating-point issues.
    amount: integer('amount').notNull(),

    type: transactionTypeEnum('type').notNull(),

    // Set by auto-categorization (Phase 5). Null = uncategorized.
    category: text('category'),

    // When the transaction actually occurred (per the statement).
    transactionDate: timestamp('transaction_date', { withTimezone: true }).notNull(),

    // How this transaction got here.
    // Values: 'manual' | 'csv' | 'pdf-opay' | 'pdf-palmpay' | 'pdf-access'
    source: text('source').notNull().default('manual'),

    // Bank's reference number, if any. Useful for deduping re-uploads.
    externalId: text('external_id'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('transactions_user_id_idx').on(table.userId),
    index('transactions_transaction_date_idx').on(table.transactionDate),
  ],
);

// ============================================
// TYPES
// ============================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;