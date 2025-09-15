import axios from 'axios';
import { ethers } from 'ethers';

// CoinGecko API service for token prices
export class CoinGeckoService {
  private readonly baseUrl = 'https://api.coingecko.com/api/v3';
  private readonly rateLimitDelay = 1000; // 1 second between requests

  async getTokenPrice(tokenId: string): Promise<{ usd: number; usd_24h_change: number } | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/simple/price`, {
        params: {
          ids: tokenId,
          vs_currencies: 'usd',
          include_24hr_change: true
        },
        timeout: 10000
      });

      const priceData = response.data[tokenId];
      if (!priceData) return null;

      return {
        usd: priceData.usd,
        usd_24h_change: priceData.usd_24h_change || 0
      };
    } catch (error) {
      console.error(`Error fetching price for ${tokenId}:`, error);
      return null;
    }
  }

  async getMultipleTokenPrices(tokenIds: string[]): Promise<Record<string, { usd: number; usd_24h_change: number }>> {
    try {
      const response = await axios.get(`${this.baseUrl}/simple/price`, {
        params: {
          ids: tokenIds.join(','),
          vs_currencies: 'usd',
          include_24hr_change: true
        },
        timeout: 15000
      });

      const results: Record<string, { usd: number; usd_24h_change: number }> = {};
      
      for (const [tokenId, priceData] of Object.entries(response.data as Record<string, any>)) {
        if (priceData && typeof priceData === 'object') {
          results[tokenId] = {
            usd: (priceData as any).usd || 0,
            usd_24h_change: (priceData as any).usd_24h_change || 0
          };
        }
      }

      return results;
    } catch (error) {
      console.error('Error fetching multiple token prices:', error);
      return {};
    }
  }

  async getTokenMarketData(tokenId: string): Promise<{
    price: number;
    marketCap: number;
    volume24h: number;
    priceChange24h: number;
  } | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/coins/${tokenId}`, {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: false,
          developer_data: false,
          sparkline: false
        },
        timeout: 10000
      });

      const marketData = response.data.market_data;
      if (!marketData) return null;

      return {
        price: marketData.current_price?.usd || 0,
        marketCap: marketData.market_cap?.usd || 0,
        volume24h: marketData.total_volume?.usd || 0,
        priceChange24h: marketData.price_change_percentage_24h || 0
      };
    } catch (error) {
      console.error(`Error fetching market data for ${tokenId}:`, error);
      return null;
    }
  }
}

// Ethereum blockchain service for wallet balances and transactions
export class EthereumService {
  private provider: ethers.JsonRpcProvider;

  constructor(rpcUrl?: string) {
    // Use public RPC endpoint or provided URL
    const defaultRpcUrl = 'https://ethereum-rpc.publicnode.com';
    this.provider = new ethers.JsonRpcProvider(rpcUrl || defaultRpcUrl);
  }

  async getETHBalance(address: string): Promise<string> {
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error(`Error getting ETH balance for ${address}:`, error);
      return '0';
    }
  }

  async getERC20Balance(tokenAddress: string, walletAddress: string, decimals: number = 18): Promise<string> {
    try {
      // ERC20 balanceOf function selector
      const balanceOfABI = ['function balanceOf(address) view returns (uint256)'];
      const contract = new ethers.Contract(tokenAddress, balanceOfABI, this.provider);
      
      const balance = await contract.balanceOf(walletAddress);
      return ethers.formatUnits(balance, decimals);
    } catch (error) {
      console.error(`Error getting ERC20 balance for ${walletAddress}:`, error);
      return '0';
    }
  }

  async getTransactionHistory(address: string, startBlock?: number, endBlock?: number): Promise<any[]> {
    try {
      // Get recent transactions for the address
      const latestBlock = await this.provider.getBlockNumber();
      const fromBlock = startBlock || Math.max(0, latestBlock - 1000); // Last 1000 blocks
      const toBlock = endBlock || latestBlock;

      // Get transactions where address is sender or receiver
      const filter = {
        fromBlock,
        toBlock,
        address: address
      };

      const logs = await this.provider.getLogs(filter);
      return logs.slice(0, 50); // Limit to 50 most recent
    } catch (error) {
      console.error(`Error getting transaction history for ${address}:`, error);
      return [];
    }
  }

  async isValidAddress(address: string): Promise<boolean> {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }

  async getCurrentBlockNumber(): Promise<number> {
    try {
      return await this.provider.getBlockNumber();
    } catch (error) {
      console.error('Error getting current block number:', error);
      return 0;
    }
  }
}

// Portfolio calculation service
export class PortfolioService {
  constructor(
    private coinGecko: CoinGeckoService,
    private ethereum: EthereumService
  ) {}

  async calculatePortfolioMetrics(walletAddress: string, tokenBalances: Array<{
    tokenAddress: string;
    balance: string;
    decimals: number;
    priceUsd: number;
  }>): Promise<{
    netWorth: number;
    totalValue: number;
    tokens: Array<{
      address: string;
      balance: string;
      usdValue: number;
      percentage: number;
    }>;
  }> {
    let totalValue = 0;
    const tokenValues: Array<{
      address: string;
      balance: string;
      usdValue: number;
      percentage: number;
    }> = [];

    // Calculate total value
    for (const token of tokenBalances) {
      const usdValue = parseFloat(token.balance) * token.priceUsd;
      totalValue += usdValue;
      
      tokenValues.push({
        address: token.tokenAddress,
        balance: token.balance,
        usdValue,
        percentage: 0 // Will calculate after total
      });
    }

    // Calculate percentages
    tokenValues.forEach(token => {
      token.percentage = totalValue > 0 ? (token.usdValue / totalValue) * 100 : 0;
    });

    return {
      netWorth: totalValue,
      totalValue,
      tokens: tokenValues
    };
  }

  calculateHealthScore(portfolioData: {
    tokens: Array<{ percentage: number }>;
    totalValue: number;
  }): string {
    if (portfolioData.totalValue === 0) return "No Holdings";
    
    const tokenCount = portfolioData.tokens.length;
    if (tokenCount === 0) return "No Holdings";
    
    // Calculate diversification score
    const maxConcentration = Math.max(...portfolioData.tokens.map(t => t.percentage));
    
    if (maxConcentration > 80) return "High Risk";
    if (maxConcentration > 60) return "Moderate Risk";
    if (tokenCount >= 3 && maxConcentration < 50) return "Well Diversified";
    if (tokenCount >= 2) return "Moderate";
    
    return "Concentrated";
  }
}

// Export singleton instances
export const coinGeckoService = new CoinGeckoService();
export const ethereumService = new EthereumService();
export const portfolioService = new PortfolioService(coinGeckoService, ethereumService);