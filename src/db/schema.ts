import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  integer,
  numeric,
  boolean,
  primaryKey,
  uniqueIndex,
  index,
  pgEnum,
  jsonb,
  date,
} from "drizzle-orm/pg-core";
import type { AdapterAccount } from "next-auth/adapters";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const walletTypeEnum = pgEnum("wallet_type", [
  "bank",
  "ewallet",
  "cash",
  "savings",
  "other",
]);

export const transactionTypeEnum = pgEnum("transaction_type", [
  "income",
  "expense",
  "transfer",
]);

export const transactionSourceEnum = pgEnum("transaction_source", [
  "web",
  "telegram_text",
  "telegram_receipt",
]);

export const categoryKindEnum = pgEnum("category_kind", ["income", "expense"]);

export const recurringFrequencyEnum = pgEnum("recurring_frequency", [
  "daily",
  "weekly",
  "monthly",
]);

export const pendingActionKindEnum = pgEnum("pending_action_kind", [
  "text_confirm",
  "receipt_confirm",
]);

export const transferDirectionEnum = pgEnum("transfer_direction", [
  "in",
  "out",
]);

// ---------------------------------------------------------------------------
// NextAuth (Auth.js) required tables — see @auth/drizzle-adapter
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount["type"]>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.provider, table.providerAccountId],
    }),
  })
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.identifier, table.token] }),
  })
);

// ---------------------------------------------------------------------------
// Domain: Wallets
// ---------------------------------------------------------------------------

export const wallets = pgTable(
  "wallets",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: walletTypeEnum("type").notNull().default("cash"),
    initialBalance: numeric("initial_balance", { precision: 16, scale: 2 })
      .notNull()
      .default("0"),
    currency: text("currency").notNull().default("IDR"),
    icon: text("icon").notNull().default("wallet"),
    color: text("color").notNull().default("#6366f1"),
    // Savings-only projection inputs
    savingsMonthlyDeposit: numeric("savings_monthly_deposit", {
      precision: 16,
      scale: 2,
    }),
    savingsAnnualInterestRate: numeric("savings_annual_interest_rate", {
      precision: 6,
      scale: 3,
    }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdx: index("wallets_user_idx").on(table.userId),
  })
);

// ---------------------------------------------------------------------------
// Domain: Categories
// ---------------------------------------------------------------------------

export const categories = pgTable(
  "categories",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // null userId = built-in default category, visible to everyone
    userId: text("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    kind: categoryKindEnum("kind").notNull(),
    icon: text("icon").notNull().default("tag"),
    color: text("color").notNull().default("#94a3b8"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdx: index("categories_user_idx").on(table.userId),
  })
);

// ---------------------------------------------------------------------------
// Domain: Transactions
// ---------------------------------------------------------------------------

export const transactions = pgTable(
  "transactions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    walletId: text("wallet_id")
      .notNull()
      .references(() => wallets.id, { onDelete: "cascade" }),
    type: transactionTypeEnum("type").notNull(),
    amount: numeric("amount", { precision: 16, scale: 2 }).notNull(),
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
    note: text("note"),
    source: transactionSourceEnum("source").notNull().default("web"),
    receiptUrl: text("receipt_url"),
    // For transfers: points to the paired transaction (out <-> in) on the other wallet
    transferPairId: text("transfer_pair_id"),
    transferDirection: transferDirectionEnum("transfer_direction"),
    recurringTransactionId: text("recurring_transaction_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdx: index("transactions_user_idx").on(table.userId),
    walletIdx: index("transactions_wallet_idx").on(table.walletId),
    dateIdx: index("transactions_date_idx").on(table.date),
    userDateIdx: index("transactions_user_date_idx").on(
      table.userId,
      table.date
    ),
  })
);

// ---------------------------------------------------------------------------
// Domain: Budgets (per user, per category, per month)
// ---------------------------------------------------------------------------

export const budgets = pgTable(
  "budgets",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    month: text("month").notNull(), // format YYYY-MM
    limitAmount: numeric("limit_amount", { precision: 16, scale: 2 }).notNull(),
    notified80: boolean("notified_80").notNull().default(false),
    notified100: boolean("notified_100").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userMonthIdx: index("budgets_user_month_idx").on(table.userId, table.month),
    uniqueBudget: uniqueIndex("budgets_user_category_month_unique").on(
      table.userId,
      table.categoryId,
      table.month
    ),
  })
);

// ---------------------------------------------------------------------------
// Domain: Recurring transactions
// ---------------------------------------------------------------------------

export const recurringTransactions = pgTable(
  "recurring_transactions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    walletId: text("wallet_id")
      .notNull()
      .references(() => wallets.id, { onDelete: "cascade" }),
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    type: transactionTypeEnum("type").notNull(),
    amount: numeric("amount", { precision: 16, scale: 2 }).notNull(),
    note: text("note"),
    frequency: recurringFrequencyEnum("frequency").notNull().default("monthly"),
    dayOfMonth: integer("day_of_month"), // 1-28 for monthly
    dayOfWeek: integer("day_of_week"), // 0-6 for weekly (0 = Sunday)
    nextRunDate: date("next_run_date", { mode: "date" }).notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdx: index("recurring_user_idx").on(table.userId),
    nextRunIdx: index("recurring_next_run_idx").on(table.nextRunDate),
  })
);

// ---------------------------------------------------------------------------
// Telegram integration
// ---------------------------------------------------------------------------

export const telegramLinks = pgTable(
  "telegram_links",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    chatId: text("chat_id").notNull().unique(),
    username: text("username"),
    linkedAt: timestamp("linked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  }
);

export const telegramLinkCodes = pgTable(
  "telegram_link_codes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    code: text("code").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    codeIdx: index("telegram_link_codes_code_idx").on(table.code),
  })
);

// Short-lived state for multi-step bot conversations (inline-keyboard confirmations)
export const telegramPendingActions = pgTable(
  "telegram_pending_actions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    chatId: text("chat_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: pendingActionKindEnum("kind").notNull(),
    payload: jsonb("payload").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    chatIdx: index("telegram_pending_actions_chat_idx").on(table.chatId),
  })
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many, one }) => ({
  wallets: many(wallets),
  categories: many(categories),
  transactions: many(transactions),
  budgets: many(budgets),
  recurringTransactions: many(recurringTransactions),
  telegramLink: one(telegramLinks, {
    fields: [users.id],
    references: [telegramLinks.userId],
  }),
}));

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, { fields: [wallets.userId], references: [users.id] }),
  transactions: many(transactions),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, { fields: [categories.userId], references: [users.id] }),
  transactions: many(transactions),
  budgets: many(budgets),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
  wallet: one(wallets, {
    fields: [transactions.walletId],
    references: [wallets.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  user: one(users, { fields: [budgets.userId], references: [users.id] }),
  category: one(categories, {
    fields: [budgets.categoryId],
    references: [categories.id],
  }),
}));

export const recurringTransactionsRelations = relations(
  recurringTransactions,
  ({ one }) => ({
    user: one(users, {
      fields: [recurringTransactions.userId],
      references: [users.id],
    }),
    wallet: one(wallets, {
      fields: [recurringTransactions.walletId],
      references: [wallets.id],
    }),
    category: one(categories, {
      fields: [recurringTransactions.categoryId],
      references: [categories.id],
    }),
  })
);

export const telegramLinksRelations = relations(telegramLinks, ({ one }) => ({
  user: one(users, { fields: [telegramLinks.userId], references: [users.id] }),
}));

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type User = typeof users.$inferSelect;
export type Wallet = typeof wallets.$inferSelect;
export type NewWallet = typeof wallets.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
export type RecurringTransaction = typeof recurringTransactions.$inferSelect;
export type NewRecurringTransaction = typeof recurringTransactions.$inferInsert;
export type TelegramLink = typeof telegramLinks.$inferSelect;
export type TelegramLinkCode = typeof telegramLinkCodes.$inferSelect;
export type TelegramPendingAction = typeof telegramPendingActions.$inferSelect;

export const DEFAULT_CATEGORIES: Array<{
  name: string;
  kind: "income" | "expense";
  icon: string;
  color: string;
}> = [
  { name: "Makanan & Minuman", kind: "expense", icon: "utensils", color: "#f97316" },
  { name: "Transportasi", kind: "expense", icon: "car", color: "#3b82f6" },
  { name: "Belanja", kind: "expense", icon: "shopping-bag", color: "#ec4899" },
  { name: "Tagihan", kind: "expense", icon: "receipt", color: "#ef4444" },
  { name: "Hiburan", kind: "expense", icon: "clapperboard", color: "#a855f7" },
  { name: "Kesehatan", kind: "expense", icon: "heart-pulse", color: "#14b8a6" },
  { name: "Pendidikan", kind: "expense", icon: "graduation-cap", color: "#0ea5e9" },
  { name: "Lainnya", kind: "expense", icon: "more-horizontal", color: "#94a3b8" },
  { name: "Gaji", kind: "income", icon: "banknote", color: "#22c55e" },
  { name: "Bonus", kind: "income", icon: "gift", color: "#eab308" },
  { name: "Investasi", kind: "income", icon: "trending-up", color: "#10b981" },
];
