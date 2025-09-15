import { Router } from 'express';
import { coinGeckoService, ethereumService, portfolioService } from '../services/blockchain';
import { storage } from '../storage';
import { insertPriceHistorySchema, insertTokenBalanceSchema, insertPortfolioSchema } from '@shared/schema';
import { z } from 'zod';

const router = Router();

// Get live token prices
router.get('/prices', async (req, res) => {
  try {
    const tokens = await storage.getAllTokens();
    const prices: Record<string, any> = {};

    // Map token symbols to CoinGecko IDs (in real implementation, this would be in the database)
    const tokenIdMap: Record<string, string> = {
      'OEC': 'bitcoin', // Using real tokens for demo - Bitcoin for OEC
      'ELOQ': 'ethereum', // Using real tokens for demo - Ethereum for ELOQ
      'ETH': 'ethereum'
    };

    // Fetch prices for all tokens
    const coinGeckoIds = Object.values(tokenIdMap);
    const priceData = await coinGeckoService.getMultipleTokenPrices(coinGeckoIds);

    // Format response
    for (const token of tokens) {
      const coinGeckoId = tokenIdMap[token.symbol];
      if (coinGeckoId && priceData[coinGeckoId]) {
        prices[token.symbol] = {
          symbol: token.symbol,
          name: token.name,
          price: priceData[coinGeckoId].usd,
          change24h: priceData[coinGeckoId].usd_24h_change,
          lastUpdated: new Date().toISOString()
        };

        // Store price history in database
        try {
          await storage.createPriceHistory({
            tokenId: token.id,
            price: priceData[coinGeckoId].usd.toString(),
            timestamp: new Date()
          });
        } catch (error) {
          console.error(`Failed to store price history for ${token.symbol}:`, error);
        }
      } else {
        // Return placeholder data for tokens not found in CoinGecko
        prices[token.symbol] = {
          symbol: token.symbol,
          name: token.name,
          price: 0,
          change24h: 0,
          lastUpdated: new Date().toISOString()
        };
      }
    }

    res.json(prices);
  } catch (error) {
    console.error('Error fetching token prices:', error);
    res.status(500).json({ error: 'Failed to fetch token prices' });
  }
});

// Get wallet balances
const getWalletBalancesSchema = z.object({
  address: z.string().min(1, 'Wallet address is required')
});

router.post('/balances', async (req, res) => {
  try {
    const { address } = getWalletBalancesSchema.parse(req.body);

    // Validate Ethereum address
    if (!await ethereumService.isValidAddress(address)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }

    const tokens = await storage.getAllTokens();
    const balances: Record<string, any> = {};

    // Get ETH balance
    const ethBalance = await ethereumService.getETHBalance(address);
    
    // Get token balances (for now, we'll use placeholder addresses)
    for (const token of tokens) {
      if (token.symbol === 'ETH') {
        balances[token.symbol] = {
          tokenId: token.id,
          symbol: token.symbol,
          balance: ethBalance,
          decimals: token.decimals,
          address: token.address
        };
      } else {
        // For OEC and ELOQ, we'll use placeholder balances since we don't have real contract addresses
        balances[token.symbol] = {
          tokenId: token.id,
          symbol: token.symbol,
          balance: '0', // Would fetch from contract in real implementation
          decimals: token.decimals,
          address: token.address
        };
      }
    }

    res.json({ address, balances });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error fetching wallet balances:', error);
    res.status(500).json({ error: 'Failed to fetch wallet balances' });
  }
});

// Calculate and get portfolio metrics
router.post('/portfolio', async (req, res) => {
  try {
    const { address } = getWalletBalancesSchema.parse(req.body);

    // Get wallet from database
    let wallet = await storage.getWalletByAddress(address);
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // Get current token balances from database
    const tokenBalances = await storage.getTokenBalances(wallet.id);
    const tokens = await storage.getAllTokens();
    
    // Get current prices
    const tokenIdMap: Record<string, string> = {
      'OEC': 'bitcoin', // Using real tokens for demo - Bitcoin for OEC
      'ELOQ': 'ethereum', // Using real tokens for demo - Ethereum for ELOQ
      'ETH': 'ethereum'
    };
    
    const coinGeckoIds = Object.values(tokenIdMap);
    const priceData = await coinGeckoService.getMultipleTokenPrices(coinGeckoIds);

    // Calculate portfolio metrics
    const portfolioTokens = tokenBalances.map(balance => {
      const token = tokens.find(t => t.id === balance.tokenId);
      const coinGeckoId = token ? tokenIdMap[token.symbol] : null;
      const price = coinGeckoId && priceData[coinGeckoId] ? priceData[coinGeckoId].usd : 0;

      return {
        tokenAddress: token?.address || '',
        balance: balance.balance,
        decimals: token?.decimals || 18,
        priceUsd: price
      };
    });

    const metrics = await portfolioService.calculatePortfolioMetrics(address, portfolioTokens);
    const healthScore = portfolioService.calculateHealthScore(metrics);

    // Update or create portfolio record
    const portfolioData = {
      walletId: wallet.id,
      netWorth: metrics.netWorth.toString(),
      pnl: '0', // Would calculate based on historical data
      pnlPercentage: '0',
      totalTrades: 0, // Would get from transaction history
      healthScore
    };

    const existingPortfolio = await storage.getPortfolio(wallet.id);
    if (existingPortfolio) {
      await storage.updatePortfolio(wallet.id, portfolioData);
    } else {
      await storage.createPortfolio(portfolioData);
    }

    res.json({
      address,
      netWorth: metrics.netWorth,
      healthScore,
      tokens: metrics.tokens,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error calculating portfolio:', error);
    res.status(500).json({ error: 'Failed to calculate portfolio metrics' });
  }
});

// Get transaction history for a wallet
router.get('/transactions/:address', async (req, res) => {
  try {
    const { address } = req.params;

    if (!await ethereumService.isValidAddress(address)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }

    // Get transactions from blockchain
    const blockchainTxs = await ethereumService.getTransactionHistory(address);
    
    // Get stored transactions from database
    const wallet = await storage.getWalletByAddress(address);
    const storedTxs = wallet ? await storage.getTransactions(wallet.id, 50) : [];

    res.json({
      address,
      transactions: storedTxs.map(tx => ({
        id: tx.id,
        txHash: tx.txHash,
        type: tx.type,
        amount: tx.amount,
        usdValue: tx.usdValue,
        timestamp: tx.timestamp,
        status: tx.status
      })),
      blockchainData: blockchainTxs.length,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transaction history' });
  }
});

// Get staking positions for a wallet
router.get('/staking/:address', async (req, res) => {
  try {
    const { address } = req.params;

    if (!await ethereumService.isValidAddress(address)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }

    const wallet = await storage.getWalletByAddress(address);
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const stakingPositions = await storage.getActiveStakingPositions(wallet.id);
    const tokens = await storage.getAllTokens();

    const positionsWithTokenData = stakingPositions.map(position => {
      const token = tokens.find(t => t.id === position.tokenId);
      return {
        id: position.id,
        poolName: position.poolName,
        stakingType: position.stakingType,
        token: token ? {
          symbol: token.symbol,
          name: token.name
        } : null,
        stakedAmount: position.stakedAmount,
        rewardsEarned: position.rewardsEarned,
        unclaimedRewards: position.unclaimedRewards,
        apy: position.apy,
        isActive: position.isActive,
        createdAt: position.createdAt
      };
    });

    res.json({
      address,
      stakingPositions: positionsWithTokenData,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching staking positions:', error);
    res.status(500).json({ error: 'Failed to fetch staking positions' });
  }
});

// Wallet connection endpoints
const connectWalletSchema = z.object({
  address: z.string().min(1, 'Wallet address is required'),
  userId: z.string().optional(),
  network: z.string().optional().default('ethereum')
});

const disconnectWalletSchema = z.object({
  address: z.string().min(1, 'Wallet address is required')
});

router.post('/wallet/connect', async (req, res) => {
  try {
    const { address, userId, network } = connectWalletSchema.parse(req.body);
    
    // Check if wallet already exists
    const existingWallet = await storage.getWalletByAddress(address);
    if (existingWallet) {
      // Update to connected state and return
      const updatedWallet = await storage.updateWallet(existingWallet.id, {
        isConnected: true
      });
      return res.json({ 
        success: true, 
        wallet: updatedWallet,
        message: 'Wallet already connected' 
      });
    }

    // Create new wallet with connected state
    const newWallet = await storage.createWallet({
      address,
      userId: userId || null,
      network,
      isConnected: true
    });

    res.json({ 
      success: true, 
      wallet: newWallet,
      message: 'Wallet connected successfully' 
    });
  } catch (error) {
    console.error('Error connecting wallet:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to connect wallet' });
  }
});

router.post('/wallet/disconnect', async (req, res) => {
  try {
    const { address } = disconnectWalletSchema.parse(req.body);
    
    // Check if wallet exists
    const existingWallet = await storage.getWalletByAddress(address);
    if (!existingWallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // Delete wallet and related data
    const deleted = await storage.deleteWallet(address);
    
    if (deleted) {
      res.json({ 
        success: true, 
        message: 'Wallet disconnected successfully' 
      });
    } else {
      res.status(500).json({ error: 'Failed to disconnect wallet' });
    }
  } catch (error) {
    console.error('Error disconnecting wallet:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to disconnect wallet' });
  }
});

export default router;