import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer, boolean, jsonb, index, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const wallets = pgTable("wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  address: text("address").notNull().unique(),
  network: text("network").notNull().default("ethereum"),
  isConnected: boolean("is_connected").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("wallets_user_id_idx").on(table.userId),
  addressIdx: index("wallets_address_idx").on(table.address),
}));

export const tokens = pgTable("tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull().unique(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  decimals: integer("decimals").notNull().default(18),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  symbolIdx: index("tokens_symbol_idx").on(table.symbol),
  addressIdx: index("tokens_address_idx").on(table.address),
}));

export const portfolios = pgTable("portfolios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletId: varchar("wallet_id").notNull().references(() => wallets.id, { onDelete: "cascade" }),
  netWorth: decimal("net_worth", { precision: 20, scale: 8 }).notNull().default("0"),
  pnl: decimal("pnl", { precision: 20, scale: 8 }).notNull().default("0"),
  pnlPercentage: decimal("pnl_percentage", { precision: 10, scale: 4 }).notNull().default("0"),
  totalTrades: integer("total_trades").notNull().default(0),
  healthScore: text("health_score").notNull().default("Unknown"),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
}, (table) => ({
  walletIdUnique: unique("portfolios_wallet_id_unique").on(table.walletId),
}));

export const tokenBalances = pgTable("token_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletId: varchar("wallet_id").notNull().references(() => wallets.id, { onDelete: "cascade" }),
  tokenId: varchar("token_id").notNull().references(() => tokens.id, { onDelete: "cascade" }),
  balance: decimal("balance", { precision: 30, scale: 18 }).notNull().default("0"),
  usdValue: decimal("usd_value", { precision: 20, scale: 8 }).notNull().default("0"),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
}, (table) => ({
  walletTokenUnique: unique("token_balances_wallet_token_unique").on(table.walletId, table.tokenId),
  walletIdIdx: index("token_balances_wallet_id_idx").on(table.walletId),
  tokenIdIdx: index("token_balances_token_id_idx").on(table.tokenId),
}));

export const stakingPositions = pgTable("staking_positions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletId: varchar("wallet_id").notNull().references(() => wallets.id, { onDelete: "cascade" }),
  tokenId: varchar("token_id").notNull().references(() => tokens.id, { onDelete: "cascade" }),
  poolName: text("pool_name").notNull(),
  stakingType: text("staking_type").notNull(), // 'governance', 'staking', 'farming'
  stakedAmount: decimal("staked_amount", { precision: 30, scale: 18 }).notNull().default("0"),
  rewardsEarned: decimal("rewards_earned", { precision: 30, scale: 18 }).notNull().default("0"),
  unclaimedRewards: decimal("unclaimed_rewards", { precision: 30, scale: 18 }).notNull().default("0"),
  apy: decimal("apy", { precision: 10, scale: 4 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  walletIdIdx: index("staking_positions_wallet_id_idx").on(table.walletId),
  tokenIdIdx: index("staking_positions_token_id_idx").on(table.tokenId),
  isActiveIdx: index("staking_positions_is_active_idx").on(table.isActive),
}));

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletId: varchar("wallet_id").notNull().references(() => wallets.id, { onDelete: "cascade" }),
  txHash: text("tx_hash").notNull().unique(),
  type: text("type").notNull(), // 'buy', 'sell', 'stake', 'unstake', 'claim', 'transfer'
  tokenId: varchar("token_id").notNull().references(() => tokens.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 30, scale: 18 }).notNull(),
  usdValue: decimal("usd_value", { precision: 20, scale: 8 }),
  gasUsed: decimal("gas_used", { precision: 20, scale: 0 }),
  gasPrice: decimal("gas_price", { precision: 20, scale: 0 }),
  blockNumber: integer("block_number"),
  status: text("status").notNull().default("confirmed"), // 'pending', 'confirmed', 'failed'
  metadata: jsonb("metadata"), // Additional transaction-specific data
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  walletIdIdx: index("transactions_wallet_id_idx").on(table.walletId),
  tokenIdIdx: index("transactions_token_id_idx").on(table.tokenId),
  txHashIdx: index("transactions_tx_hash_idx").on(table.txHash),
  timestampIdx: index("transactions_timestamp_idx").on(table.timestamp),
  statusIdx: index("transactions_status_idx").on(table.status),
}));

export const priceHistory = pgTable("price_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tokenId: varchar("token_id").notNull().references(() => tokens.id, { onDelete: "cascade" }),
  price: decimal("price", { precision: 20, scale: 8 }).notNull(),
  marketCap: decimal("market_cap", { precision: 30, scale: 8 }),
  volume24h: decimal("volume_24h", { precision: 30, scale: 8 }),
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  tokenTimestampUnique: unique("price_history_token_timestamp_unique").on(table.tokenId, table.timestamp),
  tokenIdIdx: index("price_history_token_id_idx").on(table.tokenId),
  timestampIdx: index("price_history_timestamp_idx").on(table.timestamp),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  wallets: many(wallets),
}));

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, { fields: [wallets.userId], references: [users.id] }),
  portfolio: one(portfolios),
  tokenBalances: many(tokenBalances),
  stakingPositions: many(stakingPositions),
  transactions: many(transactions),
}));

export const tokensRelations = relations(tokens, ({ many }) => ({
  tokenBalances: many(tokenBalances),
  stakingPositions: many(stakingPositions),
  transactions: many(transactions),
  priceHistory: many(priceHistory),
}));

export const portfoliosRelations = relations(portfolios, ({ one }) => ({
  wallet: one(wallets, { fields: [portfolios.walletId], references: [wallets.id] }),
}));

export const tokenBalancesRelations = relations(tokenBalances, ({ one }) => ({
  wallet: one(wallets, { fields: [tokenBalances.walletId], references: [wallets.id] }),
  token: one(tokens, { fields: [tokenBalances.tokenId], references: [tokens.id] }),
}));

export const stakingPositionsRelations = relations(stakingPositions, ({ one }) => ({
  wallet: one(wallets, { fields: [stakingPositions.walletId], references: [wallets.id] }),
  token: one(tokens, { fields: [stakingPositions.tokenId], references: [tokens.id] }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  wallet: one(wallets, { fields: [transactions.walletId], references: [wallets.id] }),
  token: one(tokens, { fields: [transactions.tokenId], references: [tokens.id] }),
}));

export const priceHistoryRelations = relations(priceHistory, ({ one }) => ({
  token: one(tokens, { fields: [priceHistory.tokenId], references: [tokens.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertWalletSchema = createInsertSchema(wallets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTokenSchema = createInsertSchema(tokens).omit({
  id: true,
  createdAt: true,
});

export const insertPortfolioSchema = createInsertSchema(portfolios).omit({
  id: true,
  lastUpdated: true,
});

export const insertTokenBalanceSchema = createInsertSchema(tokenBalances).omit({
  id: true,
  lastUpdated: true,
});

export const insertStakingPositionSchema = createInsertSchema(stakingPositions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertPriceHistorySchema = createInsertSchema(priceHistory).omit({
  id: true,
  createdAt: true,
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof wallets.$inferSelect;

export type InsertToken = z.infer<typeof insertTokenSchema>;
export type Token = typeof tokens.$inferSelect;

export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;
export type Portfolio = typeof portfolios.$inferSelect;

export type InsertTokenBalance = z.infer<typeof insertTokenBalanceSchema>;
export type TokenBalance = typeof tokenBalances.$inferSelect;

export type InsertStakingPosition = z.infer<typeof insertStakingPositionSchema>;
export type StakingPosition = typeof stakingPositions.$inferSelect;

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

export type InsertPriceHistory = z.infer<typeof insertPriceHistorySchema>;
export type PriceHistory = typeof priceHistory.$inferSelect;
