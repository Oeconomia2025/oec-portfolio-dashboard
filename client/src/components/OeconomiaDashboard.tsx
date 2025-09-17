import { useState, useEffect } from "react";
import { 
  Wallet, 
  UserCircle2, 
  Coins, 
  Sigma, 
  BarChart3, 
  TrendingUp, 
  Gauge, 
  CheckCircle2, 
  Layers, 
  Percent, 
  PiggyBank,
  ArrowDownRight,
  ArrowUpRight,
  Vote,
  ChevronDown
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { 
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "./ui/sidebar";
import { useTokenPrices, usePortfolio, useStakingPositions, useWalletConnection, formatCurrency, formatPercentageChange } from "../hooks/useBlockchainData";

interface PortfolioData {
  netWorth: string;
  pnl: string;
  pnlPercentage: string;
  totalTrades: number;
  healthScore: string;
}

interface TokenData {
  price: string;
  wallet: {
    amount: string;
    worth: string;
    change: string;
  };
}

interface OECData extends TokenData {
  governance: {
    level: string;
    worth: string;
    proposals: number;
  };
  staking: {
    active: number;
    yield: string;
    unclaimed: string;
  };
}

interface ELOQData extends TokenData {
  solo: {
    amount: string;
    yield: string;
    unclaimed: string;
  };
  farming: {
    pools: number;
    apy: string;
    unclaimed: string;
  };
}

interface StakeData {
  pool: string;
  token: string;
  amount: string;
  apy: string;
  rewards: string;
}

interface TransactionData {
  type: string;
  time: string;
  amount: string;
  usd: string;
  icon: string;
  status?: string;
}

interface WalletData {
  isConnected: boolean;
  address: string;
  network: string;
}

// Small helper for a tidy label/value row
function InfoRow({ label, value, hint }: { label: string; value?: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-right">
        <div className="text-sm font-medium text-foreground">{value ?? "—"}</div>
        {hint ? <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div> : null}
      </div>
    </div>
  );
}

function StatTile({ icon, title, value, sub, color = "primary" }: { 
  icon?: React.ReactNode; 
  title: string; 
  value?: string; 
  sub?: string;
  color?: string;
}) {
  const getColorClasses = (color: string) => {
    switch (color) {
      case "green":
        return "bg-green-500/10 text-green-400";
      case "blue":
        return "bg-blue-500/10 text-blue-400";
      case "secondary":
        return "bg-secondary/10 text-secondary";
      default:
        return "bg-primary/10 text-primary";
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card backdrop-blur p-5 shadow-lg hover:shadow-xl transition-shadow" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`h-8 w-8 rounded-xl border border-border grid place-items-center ${getColorClasses(color)}`}>
            {icon}
          </div>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{title}</span>
        </div>
      </div>
      <div className="text-2xl font-semibold text-foreground" data-testid={`value-${title.toLowerCase().replace(/\s+/g, '-')}`}>{value ?? "—"}</div>
      {sub ? <div className="text-xs text-muted-foreground mt-1">{sub}</div> : null}
    </div>
  );
}

function SectionHeader({ icon, title, chip }: { icon?: React.ReactNode; title: string; chip?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      </div>
      {chip}
    </div>
  );
}

export default function OeconomiaDashboard() {
  const [walletData, setWalletData] = useState<WalletData>({
    isConnected: false,
    address: "",
    network: "Ethereum"
  });

  const brands = [
    {
      name: "Oeconomia",
      logo: "https://pub-37d61a7eb7ae45898b46702664710cb2.r2.dev/With%20Border/OEC%20Border.png"
    },
    {
      name: "Alluria",
      logo: "https://pub-37d61a7eb7ae45898b46702664710cb2.r2.dev/With%20Border/ALUR%20Border.png"
    },
    {
      name: "Eloqura",
      logo: "https://pub-37d61a7eb7ae45898b46702664710cb2.r2.dev/With%20Border/ELOQ%20Border.png"
    },
    {
      name: "Artivya",
      logo: "https://pub-37d61a7eb7ae45898b46702664710cb2.r2.dev/With%20Border/Art%20Border.png"
    },
    {
      name: "Iridescia",
      logo: "https://pub-37d61a7eb7ae45898b46702664710cb2.r2.dev/With%20Border/III%20Border.png"
    }
  ];

  // Collapsible section states
  const [isPortfolioOpen, setIsPortfolioOpen] = useState(true);
  const [isOECOpen, setIsOECOpen] = useState(true);
  const [isELOQOpen, setIsELOQOpen] = useState(true);
  const [isStakesOpen, setIsStakesOpen] = useState(true);

  // Fetch real blockchain data
  const { data: tokenPrices = {}, isLoading: pricesLoading } = useTokenPrices();
  const { data: portfolioData, isLoading: portfolioLoading } = usePortfolio(walletData.address);
  const { data: stakingData, isLoading: stakingLoading } = useStakingPositions(walletData.address);
  const { connectWallet, disconnectWallet } = useWalletConnection();

  // Extract price data for OEC and ELOQ
  const oecPrice = tokenPrices.OEC || { price: 0, change24h: 0 };
  const eloqPrice = tokenPrices.ELOQ || { price: 0, change24h: 0 };

  const handleWalletConnect = async () => {
    try {
      if (walletData.isConnected) {
        // Disconnect wallet
        await disconnectWallet.mutateAsync({ address: walletData.address });
        setWalletData(prev => ({
          ...prev,
          isConnected: false,
          address: ""
        }));
      } else {
        // Connect wallet (simulated for demo)
        const mockAddress = "0x1234567890123456789012345678901234567890";
        await connectWallet.mutateAsync({ address: mockAddress });
        setWalletData(prev => ({
          ...prev,
          isConnected: true,
          address: mockAddress
        }));
      }
    } catch (error) {
      console.error("Failed to connect/disconnect wallet:", error);
    }
  };

  // Calculate derived data with safe fallbacks
  const netWorth = portfolioLoading ? "Loading..." : 
    (portfolioData && typeof portfolioData.netWorth === 'number') ? formatCurrency(portfolioData.netWorth) : "—";
  const healthScore = portfolioLoading ? "Loading..." : (portfolioData?.healthScore || "—");
  const lastUpdated = portfolioLoading ? "Loading..." : 
    (portfolioData?.lastUpdated || (walletData.isConnected ? "Connect wallet for live data" : "Not connected"));

  const stakes = stakingData?.stakingPositions || [];
  const transactions: TransactionData[] = []; // Will be populated when transaction API is implemented

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full bg-gradient-to-b from-gray-950 to-gray-900 text-foreground flex">
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2 px-2 py-4">
              <div className="h-8 w-8 rounded-lg bg-primary/10 grid place-items-center">
                <Coins className="h-5 w-5 text-primary" />
              </div>
              <span className="font-semibold text-lg">Portfolio</span>
            </div>
          </SidebarHeader>
          
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Brands</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {brands.map((brand) => (
                    <SidebarMenuItem key={brand.name}>
                      <div className="flex items-center gap-3 p-2 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md transition-colors">
                        <img 
                          src={brand.logo} 
                          alt={brand.name}
                          className="h-8 w-8 rounded-md object-cover flex-shrink-0"
                          onError={(e) => {
                            // Fallback to a default icon if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) {
                              fallback.classList.remove('hidden');
                            }
                          }}
                        />
                        <div className="h-8 w-8 rounded-md bg-muted/50 grid place-items-center hidden flex-shrink-0">
                          <Coins className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <span className="font-medium">{brand.name}</span>
                      </div>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          
          <SidebarFooter>
            <div className="p-2">
              <div className="text-xs text-muted-foreground text-center">
                © 2024 Portfolio Dashboard
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1">
          {/* Top Bar */}
          <div className="sticky top-0 z-50 border-b border-border bg-card/30 backdrop-blur">
            <div className="px-4 sm:px-6 lg:px-8">
              <header className="flex items-center justify-between py-4" data-testid="dashboard-header">
                <div className="flex items-center gap-4">
                  <SidebarTrigger />
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                      <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-400 via-cyan-400 to-purple-400">
                        Oeconomia Dashboard
                      </span>
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Portfolio Management • Real-time DeFi Analytics</p>
                  </div>
                </div>
                <button 
                  onClick={handleWalletConnect}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/50 backdrop-blur px-4 py-2 text-sm hover:bg-card/70 transition-colors"
                  data-testid="button-connect-wallet"
                >
                  <Wallet className="h-4 w-4" />
                  <span>{walletData.isConnected ? "Disconnect" : "Connect Wallet"}</span>
                </button>
              </header>
            </div>
          </div>

          <div className="px-4 sm:px-6 lg:px-8 py-8">

        {/* Profile */}
        <div className="mb-6 flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-muted border border-border grid place-items-center">
            <UserCircle2 className="h-9 w-9 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <div className="text-sm text-muted-foreground">Profile Name</div>
            <div className="text-lg font-semibold" data-testid="text-profile-name">Connect wallet to view profile</div>
          </div>
        </div>

        {/* Portfolio Overview */}
        <div className="mb-2">
          <div className="rounded-2xl border border-border bg-card backdrop-blur shadow-lg overflow-hidden">
            <Collapsible open={isPortfolioOpen} onOpenChange={setIsPortfolioOpen}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-6 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-2">
                    <Coins className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">Portfolio Overview</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs rounded-full border border-border px-3 py-1.5 bg-card/50">
                      Last updated: <span data-testid="text-last-update">{lastUpdated}</span>
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isPortfolioOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-6 border-t border-border/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div className="rounded-2xl bg-card backdrop-blur p-5 shadow-lg hover:shadow-xl transition-shadow" data-testid="stat-net-worth">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary grid place-items-center">
                            <BarChart3 className="h-4 w-4" />
                          </div>
                          <span className="text-xs uppercase tracking-wide text-muted-foreground">Net Worth</span>
                        </div>
                      </div>
                      <div className="text-2xl font-semibold text-foreground" data-testid="value-net-worth">{netWorth}</div>
                      <div className="text-xs text-muted-foreground mt-1">Total portfolio value</div>
                    </div>

                    <div className="rounded-2xl bg-card backdrop-blur p-5 shadow-lg hover:shadow-xl transition-shadow" data-testid="stat-p&l">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-xl bg-green-500/10 text-green-400 grid place-items-center">
                            <TrendingUp className="h-4 w-4" />
                          </div>
                          <span className="text-xs uppercase tracking-wide text-muted-foreground">P&L</span>
                        </div>
                      </div>
                      <div className="text-2xl font-semibold text-foreground" data-testid="value-p&l">{portfolioLoading ? "Loading..." : (portfolioData?.pnl ? formatCurrency(portfolioData.pnl) : (walletData.isConnected ? "—" : "Connect wallet"))}</div>
                      <div className="text-xs text-muted-foreground mt-1">Since first transaction</div>
                    </div>

                    <div className="rounded-2xl bg-card backdrop-blur p-5 shadow-lg hover:shadow-xl transition-shadow" data-testid="stat-total-trades">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-400 grid place-items-center">
                            <Sigma className="h-4 w-4" />
                          </div>
                          <span className="text-xs uppercase tracking-wide text-muted-foreground">Total Trades</span>
                        </div>
                      </div>
                      <div className="text-2xl font-semibold text-foreground" data-testid="value-total-trades">{portfolioLoading ? "Loading..." : (portfolioData?.totalTrades?.toString() || (walletData.isConnected ? "—" : "Connect wallet"))}</div>
                      <div className="text-xs text-muted-foreground mt-1">Lifetime transactions</div>
                    </div>

                    <div className="rounded-2xl bg-card backdrop-blur p-5 shadow-lg hover:shadow-xl transition-shadow" data-testid="stat-health-score">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-xl bg-secondary/10 text-secondary grid place-items-center">
                            <CheckCircle2 className="h-4 w-4" />
                          </div>
                          <span className="text-xs uppercase tracking-wide text-muted-foreground">Health Score</span>
                        </div>
                      </div>
                      <div className="text-2xl font-semibold text-foreground" data-testid="value-health-score">{healthScore}</div>
                      <div className="text-xs text-muted-foreground mt-1">Portfolio diversification</div>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        {/* OEC Token Section */}
        <div className="mb-2">
          <div className="rounded-2xl border border-border bg-card backdrop-blur shadow-lg overflow-hidden">
            <Collapsible open={isOECOpen} onOpenChange={setIsOECOpen}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-6 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <img 
                      src="https://pub-37d61a7eb7ae432fb098830b67d7ddda.r2.dev/oeconomia.png" 
                      alt="Oeconomia"
                      className="h-8 w-8 rounded-md object-cover flex-shrink-0"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) {
                          fallback.classList.remove('hidden');
                        }
                      }}
                    />
                    <Coins className="h-5 w-5 text-primary hidden" />
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">OEC Token</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs rounded-full border border-border px-3 py-1.5 bg-card/50">
                      Price: <span data-testid="text-oec-price">{pricesLoading ? "Loading..." : formatCurrency(oecPrice.price)}</span>
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isOECOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-6 border-t border-border/50">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="rounded-xl bg-muted/20 p-6" data-testid="card-oec-wallet">
                      <div className="flex items-center gap-2 mb-4">
                        <PiggyBank className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold">Wallet Balance</h3>
                      </div>
                      <div className="space-y-3">
                        <InfoRow label="Amount" value={walletData.isConnected ? "—" : "Connect wallet"} />
                        <InfoRow label="USD Value" value={walletData.isConnected ? "—" : "Connect wallet"} />
                        <InfoRow label="24h Change" value={pricesLoading ? "Loading..." : formatPercentageChange(oecPrice.change24h).text} />
                      </div>
                    </div>

                    <div className="rounded-xl bg-muted/20 p-6" data-testid="card-oec-staking">
                      <div className="flex items-center gap-2 mb-4">
                        <Layers className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold">Staking</h3>
                      </div>
                      <div className="space-y-3">
                        <InfoRow label="Active Stakes" value={stakingLoading ? "Loading..." : stakes.filter((s: any) => s.stakingType === 'staking').length.toString()} />
                        <InfoRow label="Total Yield" value={stakingLoading ? "Loading..." : "—"} />
                        <InfoRow label="Unclaimed" value={stakingLoading ? "Loading..." : "—"} />
                      </div>
                    </div>

                    <div className="rounded-xl bg-muted/20 p-6" data-testid="card-oec-governance">
                      <div className="flex items-center gap-2 mb-4">
                        <Gauge className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold">Governance</h3>
                      </div>
                      <div className="space-y-3">
                        <InfoRow label="Voting Power" value={walletData.isConnected ? "—" : "Connect wallet"} />
                        <InfoRow label="Total Worth" value={walletData.isConnected ? "—" : "Connect wallet"} />
                        <InfoRow label="Active Proposals" value={walletData.isConnected ? "—" : "Connect wallet"} />
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        {/* ELOQ Token Section */}
        <div className="mb-2">
          <div className="rounded-2xl border border-border bg-card backdrop-blur shadow-lg overflow-hidden">
            <Collapsible open={isELOQOpen} onOpenChange={setIsELOQOpen}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-6 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <img 
                      src="https://pub-37d61a7eb7ae432fb098830b67d7ddda.r2.dev/eloqura.png" 
                      alt="Eloqura"
                      className="h-8 w-8 rounded-md object-cover flex-shrink-0"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) {
                          fallback.classList.remove('hidden');
                        }
                      }}
                    />
                    <Coins className="h-5 w-5 text-secondary hidden" />
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">ELOQ Token</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs rounded-full border border-border px-3 py-1.5 bg-card/50">
                      Price: <span data-testid="text-eloq-price">{pricesLoading ? "Loading..." : formatCurrency(eloqPrice.price)}</span>
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isELOQOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-6 border-t border-border/50">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="rounded-xl bg-muted/20 p-6" data-testid="card-eloq-wallet">
                      <div className="flex items-center gap-2 mb-4">
                        <PiggyBank className="h-5 w-5 text-secondary" />
                        <h3 className="font-semibold">Wallet Balance</h3>
                      </div>
                      <div className="space-y-3">
                        <InfoRow label="Amount" value={walletData.isConnected ? "—" : "Connect wallet"} />
                        <InfoRow label="USD Value" value={walletData.isConnected ? "—" : "Connect wallet"} />
                        <InfoRow label="24h Change" value={pricesLoading ? "Loading..." : formatPercentageChange(eloqPrice.change24h).text} />
                      </div>
                    </div>

                    <div className="rounded-xl bg-muted/20 p-6" data-testid="card-eloq-solo">
                      <div className="flex items-center gap-2 mb-4">
                        <CheckCircle2 className="h-5 w-5 text-secondary" />
                        <h3 className="font-semibold">Solo Staking</h3>
                      </div>
                      <div className="space-y-3">
                        <InfoRow label="Staked Amount" value={stakingLoading ? "Loading..." : "—"} />
                        <InfoRow label="Total Yield" value={stakingLoading ? "Loading..." : "—"} />
                        <InfoRow label="Unclaimed" value={stakingLoading ? "Loading..." : "—"} />
                      </div>
                    </div>

                    <div className="rounded-xl bg-muted/20 p-6" data-testid="card-eloq-farming">
                      <div className="flex items-center gap-2 mb-4">
                        <Percent className="h-5 w-5 text-secondary" />
                        <h3 className="font-semibold">Liquidity Farming</h3>
                      </div>
                      <div className="space-y-3">
                        <InfoRow label="Active Pools" value={stakingLoading ? "Loading..." : stakes.filter((s: any) => s.stakingType === 'farming').length.toString()} />
                        <InfoRow label="Avg APY" value={stakingLoading ? "Loading..." : "—"} />
                        <InfoRow label="Unclaimed" value={stakingLoading ? "Loading..." : "—"} />
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        {/* Stakes Detail and Recent Transactions */}
        <div className="mb-2">
          <div className="rounded-2xl border border-border bg-card backdrop-blur shadow-lg overflow-hidden">
            <Collapsible open={isStakesOpen} onOpenChange={setIsStakesOpen}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-6 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <img 
                      src="https://pub-37d61a7eb7ae45898b46702664710cb2.r2.dev/With%20Border/Art%20Border.png" 
                      alt="Artivya"
                      className="h-8 w-8 rounded-md object-cover flex-shrink-0"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) {
                          fallback.classList.remove('hidden');
                        }
                      }}
                    />
                    <Layers className="h-5 w-5 text-primary hidden" />
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">Stakes & Transactions</h2>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isStakesOpen ? 'rotate-180' : ''}`} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-6 border-t border-border/50">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div className="rounded-xl bg-muted/20 p-6" data-testid="card-stakes-detail">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Active Stakes</h3>
                        <span className="text-xs text-muted-foreground">Live Data</span>
                      </div>
                      <div className="overflow-hidden rounded-lg">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50 text-muted-foreground">
                            <tr>
                              <th className="text-left p-3 font-medium">Pool</th>
                              <th className="text-left p-3 font-medium">Token</th>
                              <th className="text-right p-3 font-medium">Amount</th>
                              <th className="text-right p-3 font-medium">APY</th>
                              <th className="text-right p-3 font-medium">Rewards</th>
                            </tr>
                          </thead>
                          <tbody data-testid="table-stakes">
                            {stakes.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                                  Connect wallet to view staking positions
                                </td>
                              </tr>
                            ) : (
                              stakes.map((stake: any, index: number) => (
                                <tr key={index} className="hover:bg-muted/30" data-testid={`row-stake-${index}`}>
                                  <td className="p-3">{stake.pool}</td>
                                  <td className="p-3">{stake.token}</td>
                                  <td className="p-3 text-right font-mono">{stake.amount}</td>
                                  <td className="p-3 text-right">{stake.apy}</td>
                                  <td className="p-3 text-right text-green-400">{stake.rewards}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="rounded-xl bg-muted/20 p-6" data-testid="card-recent-transactions">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Recent Transactions</h3>
                        <button className="text-xs text-primary hover:text-primary/80" data-testid="button-view-all">View All</button>
                      </div>
                      <div className="space-y-3" data-testid="list-transactions">
                        {transactions.length === 0 ? (
                          <div className="text-center text-muted-foreground py-8">
                            Connect wallet to view transaction history
                          </div>
                        ) : (
                          transactions.map((tx, index) => (
                            <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-background/50" data-testid={`transaction-${index}`}>
                              <div className="flex items-center gap-3">
                                <div className={`h-8 w-8 rounded-lg grid place-items-center ${
                                  tx.icon === "reward" ? "bg-green-500/10" :
                                  tx.icon === "deposit" ? "bg-blue-500/10" :
                                  "bg-purple-500/10"
                                }`}>
                                  {tx.icon === "reward" && <ArrowDownRight className="h-4 w-4 text-green-400" />}
                                  {tx.icon === "deposit" && <ArrowUpRight className="h-4 w-4 text-blue-400" />}
                                  {tx.icon === "vote" && <Vote className="h-4 w-4 text-purple-400" />}
                                </div>
                                <div>
                                  <div className="text-sm font-medium">{tx.type}</div>
                                  <div className="text-xs text-muted-foreground">{tx.time}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium">{tx.amount}</div>
                                <div className="text-xs text-muted-foreground">{tx.usd}</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        {/* Footer */}
            <footer className="mt-12 pt-8 border-t border-border" data-testid="dashboard-footer">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div>© 2024 Oeconomia Dashboard. Portfolio management made simple.</div>
                <div className="flex items-center gap-4">
                  <span>Last sync: <span data-testid="text-last-sync">Connect wallet for live sync</span></span>
                  <div className="flex items-center gap-1">
                    <span className={`h-2 w-2 rounded-full ${walletData.isConnected ? 'bg-green-400' : 'bg-yellow-500'}`}></span>
                    <span data-testid="status-live">{walletData.isConnected ? "Live" : "Offline"}</span>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}