import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Add proper return types for TanStack Query v5 compatibility

// Types for API responses
interface TokenPrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  lastUpdated: string;
}

interface WalletBalance {
  tokenId: string;
  symbol: string;
  balance: string;
  decimals: number;
  address: string;
}

interface Portfolio {
  address: string;
  netWorth: number;
  healthScore: string;
  tokens: Array<{
    address: string;
    balance: string;
    usdValue: number;
    percentage: number;
  }>;
  lastUpdated: string;
}

interface StakingPosition {
  id: string;
  poolName: string;
  stakingType: string;
  token: {
    symbol: string;
    name: string;
  } | null;
  stakedAmount: string;
  rewardsEarned: string;
  unclaimedRewards: string;
  apy: string;
  isActive: boolean;
  createdAt: string;
}

interface Transaction {
  id: string;
  txHash: string;
  type: string;
  amount: string;
  usdValue: string;
  timestamp: string;
  status: string;
}

// Hook for fetching token prices
export function useTokenPrices() {
  return useQuery<Record<string, TokenPrice>>({
    queryKey: ['/api/blockchain/prices'],
    queryFn: async () => (await apiRequest('GET', '/api/blockchain/prices')).json(),
    staleTime: 30000, // Cache for 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}

// Hook for fetching wallet balances
export function useWalletBalances(address: string | null) {
  return useQuery({
    queryKey: ['/api/blockchain/balances', address],
    queryFn: async () => {
      if (!address) return null;
      return (await apiRequest('POST', '/api/blockchain/balances', { address })).json();
    },
    enabled: !!address,
    staleTime: 10000, // Cache for 10 seconds
  });
}

// Hook for fetching portfolio metrics
export function usePortfolio(address: string | null) {
  return useQuery({
    queryKey: ['/api/blockchain/portfolio', address],
    queryFn: async () => {
      if (!address) return null;
      return (await apiRequest('POST', '/api/blockchain/portfolio', { address })).json();
    },
    enabled: !!address,
    staleTime: 15000, // Cache for 15 seconds
  });
}

// Hook for fetching transaction history
export function useTransactionHistory(address: string | null) {
  return useQuery({
    queryKey: ['/api/blockchain/transactions', address],
    queryFn: async () => {
      if (!address) return null;
      return (await apiRequest('GET', `/api/blockchain/transactions/${address}`)).json();
    },
    enabled: !!address,
    staleTime: 30000, // Cache for 30 seconds
  });
}

// Hook for fetching staking positions
export function useStakingPositions(address: string | null) {
  return useQuery({
    queryKey: ['/api/blockchain/staking', address],
    queryFn: async () => {
      if (!address) return null;
      return (await apiRequest('GET', `/api/blockchain/staking/${address}`)).json();
    },
    enabled: !!address,
    staleTime: 20000, // Cache for 20 seconds
  });
}

// Hook for wallet connection
export function useWalletConnection() {
  const queryClient = useQueryClient();

  const connectWallet = useMutation({
    mutationFn: async (data: { address: string; userId?: string; network?: string }) =>
      (await apiRequest('POST', '/api/blockchain/wallet/connect', data)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blockchain'] });
    }
  });

  const disconnectWallet = useMutation({
    mutationFn: async (data: { address: string }) =>
      (await apiRequest('POST', '/api/blockchain/wallet/disconnect', data)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blockchain'] });
    }
  });

  return {
    connectWallet,
    disconnectWallet
  };
}

// Utility function to format currency
export function formatCurrency(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0.00';
  
  if (num >= 1e9) {
    return `$${(num / 1e9).toFixed(2)}B`;
  } else if (num >= 1e6) {
    return `$${(num / 1e6).toFixed(2)}M`;
  } else if (num >= 1e3) {
    return `$${(num / 1e3).toFixed(2)}K`;
  } else {
    return `$${num.toFixed(2)}`;
  }
}

// Utility function to format token amounts
export function formatTokenAmount(amount: string | number, decimals: number = 18): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0';
  
  if (num >= 1e9) {
    return `${(num / 1e9).toFixed(2)}B`;
  } else if (num >= 1e6) {
    return `${(num / 1e6).toFixed(2)}M`;
  } else if (num >= 1e3) {
    return `${(num / 1e3).toFixed(2)}K`;
  } else {
    return num.toFixed(4);
  }
}

// Utility function to format percentage change
export function formatPercentageChange(change: number): { text: string; color: string } {
  const formatted = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
  const color = change >= 0 ? 'text-green-400' : 'text-red-400';
  return { text: formatted, color };
}