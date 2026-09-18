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

export const pacingModeEnum = pgEnum('pacing_mode', [
  'daily',
  'weekly',
]);

// ============================================
// USERS
// Synced from Clerk. Created on first sign-in.
// ============================================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),

  clerkUserId: text('clerk_user_id').notNull().unique(),

  email: text('email').notNull(),
  displayName: text('display_name'),

  // Monthly spending cap in kobo (₦1 = 100 kobo).
  // Null until the user completes the cap step.
  monthlyCap: integer('monthly_cap'),

  // ISO currency code. NGN by default.
  currency: text('currency').notNull().default('NGN'),

  // Pacing preference. Daily = per-day allowance, weekly = daily * 7.
  pacingMode: pacingModeEnum('pacing_mode').notNull().default('daily'),

  // Onboarding wizard position.
  //   0 = not started
  //   1 = cap set, needs baseline upload/view
  //   2 = baseline done, needs pacing mode
  //   3 = complete
  onboardingStep: integer('onboarding_step').notNull().default(0),

  // Timestamps for each onboarding milestone
  capCompletedAt: timestamp('cap_completed_at', { withTimezone: true }),
  baselineCompletedAt: timestamp('baseline_completed_at', { withTimezone: true }),
  onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true }),

  // Reminder settings (Phase 6)
  reminderHour: integer('reminder_hour'),
  reminderTimezone: text('reminder_timezone'),
  notificationsEnabled: boolean('notifications_enabled').notNull().default(true),
  lastNotifiedAt: timestamp('last_notified_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ============================================
// TRANSACTIONS
// ============================================

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    description: text('description').notNull(),

    // Always positive. Direction determined by `type`.
    // Stored in kobo to avoid floating-point issues.
    amount: integer('amount').notNull(),

    type: transactionTypeEnum('type').notNull(),

    // Set by auto-categorization (Phase 5). Null = uncategorized.
    category: text('category'),

    transactionDate: timestamp('transaction_date', { withTimezone: true }).notNull(),

    // 'manual' | 'csv' | 'pdf-opay' | 'pdf-palmpay' | 'pdf-access'
    source: text('source').notNull().default('manual'),

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