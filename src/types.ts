export type RaceStatus = "live" | "queued" | "final" | "paused";

export interface MarketCapSnapshot {
  marketCapUsd: number;
  priceUsd: number | null;
  source: "dexscreener" | "helius" | "fallback";
  recordedAt: string;
}

export type RaceSnapshot = Record<string, MarketCapSnapshot>;

export interface KolProfile {
  id: string;
  name: string;
  symbol: string;
  xHandle: string;
  xUrl: string;
  avatarUrl?: string;
  contractAddress?: string;
  marketUrl?: string;
  terminalUrl?: string;
  wins: number;
  losses: number;
  seed: number;
  color: string;
  marketCapUsd: number;
}

export interface RaceEntrant extends KolProfile {
  progress: number;
  rank: number;
  startMarketCapUsd: number;
  marketCapUsd: number;
  percentChange: number;
  isLeader: boolean;
}

export interface RaceInterval {
  id: string;
  label: string;
  status: RaceStatus;
  startsAt: string;
  endsAt: string;
  entrants: string[];
  kolFeesSol: number;
  entrantFeesSol: number;
  snapshotStart?: RaceSnapshot | null;
  snapshotEnd?: RaceSnapshot | null;
  liveMarketCaps?: RaceSnapshot | null;
}

export interface TournamentStats {
  totalKolBurned: number;
  solAirdropped: number;
  winningKolBonusSol: number;
  finalsVaultSol: number;
  totalFeesSol: number;
}

export interface PrizeSplit {
  winnerHolders: number;
  kolAirdrop: number;
  winningKolBonus: number;
  buybackBurn: number;
  finalsVault: number;
}
