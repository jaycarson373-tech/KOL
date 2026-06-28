export type RaceStatus = "scheduled" | "live" | "completed" | "paused";
export type DistributionStatus = "queued" | "ready" | "complete" | "failed";
export type HolderSnapshotKind = "winner_kol" | "kol_airdrop";

export interface Kol {
  id: string;
  name: string;
  symbol: string;
  xHandle: string;
  xUrl: string;
  avatarUrl: string | null;
  tokenMint: string | null;
  marketUrl: string | null;
  terminalUrl: string | null;
  feeWallet: string | null;
  wins: number;
  losses: number;
  seed: number;
  color: string;
  fallbackMarketCapUsd: number;
}

export interface MarketCapSnapshot {
  marketCapUsd: number;
  priceUsd: number | null;
  source: "dexscreener" | "helius" | "fallback";
  recordedAt: string;
}

export type RaceSnapshot = Record<string, MarketCapSnapshot>;

export interface RaceIntervalRecord {
  id: string;
  label: string;
  status: RaceStatus;
  startsAt: string;
  endsAt: string;
  entrantIds: string[];
  snapshotStart: RaceSnapshot | null;
  snapshotEnd: RaceSnapshot | null;
  liveMarketCaps: RaceSnapshot | null;
  winnerKolId: string | null;
  kolFeesSol: number;
  entrantFeesSol: number;
  distributionComplete: boolean;
}

export interface TokenHolderBalance {
  owner: string;
  amount: number;
}

export interface HolderSnapshot {
  id: string;
  raceId: string;
  mint: string;
  kind: HolderSnapshotKind;
  capturedAt: string;
  holderCount: number;
  totalTokenAmount: number;
  holders: TokenHolderBalance[];
}

export interface PayoutRecipient {
  wallet: string;
  tokenAmount: number;
  amountSol: number;
}

export interface PayoutPlan {
  generatedAt: string;
  raceId: string;
  winningKolId: string;
  winningKolMint: string;
  kolMint: string;
  minKolHolding: number;
  winnerHolderRecipients: PayoutRecipient[];
  kolHolderRecipients: PayoutRecipient[];
  winningKolBonusTransfer: PayoutRecipient | null;
  buybackBurnTransfer: PayoutRecipient | null;
  finalsVaultTransfer: PayoutRecipient | null;
  excludedWallets: string[];
  holderSnapshotIds: string[];
}

export interface Distribution {
  id: string;
  raceId: string;
  winningKolId: string;
  winnerHoldersAmountSol: number;
  kolAirdropAmountSol: number;
  winningKolBonusAmountSol: number;
  buybackBurnAmountSol: number;
  finalsVaultAmountSol: number;
  txStatus: DistributionStatus;
  readyAt: string;
  createdAt: string;
  completedAt: string | null;
  payoutPlan: PayoutPlan | null;
  txSignatures: string[];
  failedReason: string | null;
}
