import { 
  type User, 
  type InsertUser,
  type Wallet,
  type InsertWallet,
  type Token,
  type InsertToken,
  type Portfolio,
  type InsertPortfolio,
  type TokenBalance,
  type InsertTokenBalance,
  type StakingPosition,
  type InsertStakingPosition,
  type Transaction,
  type InsertTransaction,
  type PriceHistory,
  type InsertPriceHistory,
  users,
  wallets,
  tokens,
  portfolios,
  tokenBalances,
  stakingPositions,
  transactions,
  priceHistory
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean>;

  // Wallet operations
  getWallet(id: string): Promise<Wallet | undefined>;
  getWalletByAddress(address: string): Promise<Wallet | undefined>;
  getUserWallets(userId: string): Promise<Wallet[]>;
  createWallet(wallet: InsertWallet): Promise<Wallet>;
  updateWallet(id: string, updates: Partial<InsertWallet>): Promise<Wallet | undefined>;

  // Token operations
  getToken(id: string): Promise<Token | undefined>;
  getTokenBySymbol(symbol: string): Promise<Token | undefined>;
  getAllTokens(): Promise<Token[]>;
  createToken(token: InsertToken): Promise<Token>;

  // Portfolio operations
  getPortfolio(walletId: string): Promise<Portfolio | undefined>;
  createPortfolio(portfolio: InsertPortfolio): Promise<Portfolio>;
  updatePortfolio(walletId: string, updates: Partial<InsertPortfolio>): Promise<Portfolio | undefined>;

  // Token balance operations
  getTokenBalances(walletId: string): Promise<TokenBalance[]>;
  getTokenBalance(walletId: string, tokenId: string): Promise<TokenBalance | undefined>;
  upsertTokenBalance(balance: InsertTokenBalance): Promise<TokenBalance>;

  // Staking operations
  getStakingPositions(walletId: string): Promise<StakingPosition[]>;
  getActiveStakingPositions(walletId: string): Promise<StakingPosition[]>;
  createStakingPosition(position: InsertStakingPosition): Promise<StakingPosition>;
  updateStakingPosition(id: string, updates: Partial<InsertStakingPosition>): Promise<StakingPosition | undefined>;

  // Transaction operations
  getTransactions(walletId: string, limit?: number): Promise<Transaction[]>;
  getTransaction(txHash: string): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;

  // Price history operations
  getLatestPrice(tokenId: string): Promise<PriceHistory | undefined>;
  getPriceHistory(tokenId: string, limit?: number): Promise<PriceHistory[]>;
  createPriceHistory(priceData: InsertPriceHistory): Promise<PriceHistory>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(insertUser.password, saltRounds);
    const [user] = await db.insert(users).values({
      ...insertUser,
      password: hashedPassword
    }).returning();
    return user;
  }

  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Wallet operations
  async getWallet(id: string): Promise<Wallet | undefined> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.id, id));
    return wallet || undefined;
  }

  async getWalletByAddress(address: string): Promise<Wallet | undefined> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.address, address));
    return wallet || undefined;
  }

  async getUserWallets(userId: string): Promise<Wallet[]> {
    return await db.select().from(wallets).where(eq(wallets.userId, userId));
  }

  async createWallet(wallet: InsertWallet): Promise<Wallet> {
    const [newWallet] = await db.insert(wallets).values(wallet).returning();
    return newWallet;
  }

  async updateWallet(id: string, updates: Partial<InsertWallet>): Promise<Wallet | undefined> {
    const [wallet] = await db.update(wallets).set({
      ...updates,
      updatedAt: new Date()
    }).where(eq(wallets.id, id)).returning();
    return wallet || undefined;
  }

  // Token operations
  async getToken(id: string): Promise<Token | undefined> {
    const [token] = await db.select().from(tokens).where(eq(tokens.id, id));
    return token || undefined;
  }

  async getTokenBySymbol(symbol: string): Promise<Token | undefined> {
    const [token] = await db.select().from(tokens).where(eq(tokens.symbol, symbol));
    return token || undefined;
  }

  async getAllTokens(): Promise<Token[]> {
    return await db.select().from(tokens);
  }

  async createToken(token: InsertToken): Promise<Token> {
    const [newToken] = await db.insert(tokens).values(token).returning();
    return newToken;
  }

  // Portfolio operations
  async getPortfolio(walletId: string): Promise<Portfolio | undefined> {
    const [portfolio] = await db.select().from(portfolios).where(eq(portfolios.walletId, walletId));
    return portfolio || undefined;
  }

  async createPortfolio(portfolio: InsertPortfolio): Promise<Portfolio> {
    const [newPortfolio] = await db.insert(portfolios).values(portfolio).returning();
    return newPortfolio;
  }

  async updatePortfolio(walletId: string, updates: Partial<InsertPortfolio>): Promise<Portfolio | undefined> {
    const [portfolio] = await db.update(portfolios).set({
      ...updates,
      lastUpdated: new Date()
    }).where(eq(portfolios.walletId, walletId)).returning();
    return portfolio || undefined;
  }

  // Token balance operations
  async getTokenBalances(walletId: string): Promise<TokenBalance[]> {
    return await db.select().from(tokenBalances).where(eq(tokenBalances.walletId, walletId));
  }

  async getTokenBalance(walletId: string, tokenId: string): Promise<TokenBalance | undefined> {
    const [balance] = await db.select().from(tokenBalances)
      .where(and(eq(tokenBalances.walletId, walletId), eq(tokenBalances.tokenId, tokenId)));
    return balance || undefined;
  }

  async upsertTokenBalance(balance: InsertTokenBalance): Promise<TokenBalance> {
    const [result] = await db.insert(tokenBalances)
      .values(balance)
      .onConflictDoUpdate({
        target: [tokenBalances.walletId, tokenBalances.tokenId],
        set: {
          balance: balance.balance,
          usdValue: balance.usdValue,
          lastUpdated: new Date()
        }
      })
      .returning();
    return result;
  }

  // Staking operations
  async getStakingPositions(walletId: string): Promise<StakingPosition[]> {
    return await db.select().from(stakingPositions).where(eq(stakingPositions.walletId, walletId));
  }

  async getActiveStakingPositions(walletId: string): Promise<StakingPosition[]> {
    return await db.select().from(stakingPositions)
      .where(and(eq(stakingPositions.walletId, walletId), eq(stakingPositions.isActive, true)));
  }

  async createStakingPosition(position: InsertStakingPosition): Promise<StakingPosition> {
    const [newPosition] = await db.insert(stakingPositions).values(position).returning();
    return newPosition;
  }

  async updateStakingPosition(id: string, updates: Partial<InsertStakingPosition>): Promise<StakingPosition | undefined> {
    const [position] = await db.update(stakingPositions).set({
      ...updates,
      updatedAt: new Date()
    }).where(eq(stakingPositions.id, id)).returning();
    return position || undefined;
  }

  // Transaction operations
  async getTransactions(walletId: string, limit: number = 50): Promise<Transaction[]> {
    return await db.select().from(transactions)
      .where(eq(transactions.walletId, walletId))
      .orderBy(desc(transactions.timestamp))
      .limit(limit);
  }

  async getTransaction(txHash: string): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.txHash, txHash));
    return transaction || undefined;
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db.insert(transactions).values(transaction).returning();
    return newTransaction;
  }

  // Price history operations
  async getLatestPrice(tokenId: string): Promise<PriceHistory | undefined> {
    const [price] = await db.select().from(priceHistory)
      .where(eq(priceHistory.tokenId, tokenId))
      .orderBy(desc(priceHistory.timestamp))
      .limit(1);
    return price || undefined;
  }

  async getPriceHistory(tokenId: string, limit: number = 100): Promise<PriceHistory[]> {
    return await db.select().from(priceHistory)
      .where(eq(priceHistory.tokenId, tokenId))
      .orderBy(desc(priceHistory.timestamp))
      .limit(limit);
  }

  async createPriceHistory(priceData: InsertPriceHistory): Promise<PriceHistory> {
    const [newPrice] = await db.insert(priceHistory).values(priceData).returning();
    return newPrice;
  }
}

export const storage = new DatabaseStorage();
