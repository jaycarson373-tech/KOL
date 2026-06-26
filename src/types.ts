export type RaceStatus = "live" | "queued" | "final";

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
}

export interface TournamentStats {
  totalKolBurned: number;
  solAirdropped: number;
  finalsVaultSol: number;
  totalFeesSol: number;
}

export interface PrizeSplit {
  winnerHolders: number;
  kolAirdrop: number;
  buybackBurn: number;
  finalsVault: number;
}
