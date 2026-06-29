import { createClient } from "@supabase/supabase-js";
import type { KolProfile, PayoutStatus, PayoutTransaction, RaceInterval, RaceSnapshot, RaceStatus } from "../types";

type SupabaseRaceStatus = "scheduled" | "live" | "completed" | "paused";

interface KolRow {
  id: string;
  name: string;
  symbol: string;
  x_handle: string;
  x_url: string;
  avatar_url: string | null;
  token_mint: string | null;
  market_url: string | null;
  terminal_url: string | null;
  wins: number;
  losses: number;
  seed: number;
  color: string;
  fallback_market_cap_usd: number | string;
}

interface RaceRow {
  id: string;
  label: string;
  status: SupabaseRaceStatus;
  starts_at: string;
  ends_at: string;
  entrant_ids: string[];
  snapshot_start: RaceSnapshot | null;
  snapshot_end: RaceSnapshot | null;
  live_market_caps: RaceSnapshot | null;
  kol_fees_sol: number | string;
  entrant_fees_sol: number | string;
}

interface DistributionRow {
  id: string;
  race_id: string;
  winning_kol_id: string;
  winner_holders_amount_sol: number | string;
  kol_airdrop_amount_sol: number | string;
  winning_kol_bonus_amount_sol: number | string;
  buyback_burn_amount_sol: number | string;
  finals_vault_amount_sol: number | string;
  tx_status: PayoutStatus;
  ready_at: string;
  completed_at: string | null;
  tx_signatures: string[] | null;
  failed_reason: string | null;
}

export interface RaceFeed {
  race: RaceInterval | null;
  kols: KolProfile[];
  upcomingRaces: RaceInterval[];
  payoutTransactions: PayoutTransaction[];
  isLiveRaceActive: boolean;
  isConfigured: boolean;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const client =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
        },
      })
    : null;

function toRaceStatus(status: SupabaseRaceStatus): RaceStatus {
  if (status === "live") {
    return "live";
  }

  if (status === "completed") {
    return "final";
  }

  if (status === "paused") {
    return "paused";
  }

  return "queued";
}

function toKolProfile(row: KolRow): KolProfile {
  return {
    id: row.id,
    name: row.name,
    symbol: row.symbol,
    xHandle: row.x_handle,
    xUrl: row.x_url,
    avatarUrl: row.avatar_url ?? undefined,
    contractAddress: row.token_mint ?? undefined,
    marketUrl: row.market_url ?? undefined,
    terminalUrl: row.terminal_url ?? undefined,
    wins: row.wins,
    losses: row.losses,
    seed: row.seed,
    color: row.color,
    marketCapUsd: Number(row.fallback_market_cap_usd),
  };
}

function toRaceInterval(row: RaceRow): RaceInterval {
  return {
    id: row.id,
    label: row.label,
    status: toRaceStatus(row.status),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    entrants: row.entrant_ids,
    kolFeesSol: Number(row.kol_fees_sol),
    entrantFeesSol: Number(row.entrant_fees_sol),
    snapshotStart: row.snapshot_start,
    snapshotEnd: row.snapshot_end,
    liveMarketCaps: row.live_market_caps,
  };
}

function toPayoutTransaction(row: DistributionRow): PayoutTransaction {
  return {
    id: row.id,
    raceId: row.race_id,
    winningKolId: row.winning_kol_id,
    status: row.tx_status,
    readyAt: row.ready_at,
    completedAt: row.completed_at,
    winnerHoldersAmountSol: Number(row.winner_holders_amount_sol),
    kolAirdropAmountSol: Number(row.kol_airdrop_amount_sol),
    winningKolBonusAmountSol: Number(row.winning_kol_bonus_amount_sol),
    buybackBurnAmountSol: Number(row.buyback_burn_amount_sol),
    finalsVaultAmountSol: Number(row.finals_vault_amount_sol),
    txSignatures: Array.isArray(row.tx_signatures) ? row.tx_signatures : [],
    failedReason: row.failed_reason,
  };
}

async function fetchKols(): Promise<KolProfile[]> {
  if (!client) {
    return [];
  }

  const { data, error } = await client
    .from("kols")
    .select(
      "id,name,symbol,x_handle,x_url,avatar_url,token_mint,market_url,terminal_url,wins,losses,seed,color,fallback_market_cap_usd",
    )
    .order("seed", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as KolRow[]).map(toKolProfile);
}

async function fetchLiveRace(): Promise<RaceInterval | null> {
  if (!client) {
    return null;
  }

  const { data, error } = await client
    .from("race_intervals")
    .select(
      "id,label,status,starts_at,ends_at,entrant_ids,snapshot_start,snapshot_end,live_market_caps,kol_fees_sol,entrant_fees_sol",
    )
    .eq("status", "live")
    .order("starts_at", { ascending: true })
    .limit(1);

  if (error) {
    throw error;
  }

  const row = (data ?? [])[0] as RaceRow | undefined;
  return row ? toRaceInterval(row) : null;
}

async function fetchUpcomingRaces(): Promise<RaceInterval[]> {
  if (!client) {
    return [];
  }

  const { data, error } = await client
    .from("race_intervals")
    .select(
      "id,label,status,starts_at,ends_at,entrant_ids,snapshot_start,snapshot_end,live_market_caps,kol_fees_sol,entrant_fees_sol",
    )
    .eq("status", "scheduled")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(7);

  if (error) {
    throw error;
  }

  return ((data ?? []) as RaceRow[]).map(toRaceInterval);
}

async function fetchPayoutTransactions(): Promise<PayoutTransaction[]> {
  if (!client) {
    return [];
  }

  const { data, error } = await client
    .from("distributions")
    .select(
      "id,race_id,winning_kol_id,winner_holders_amount_sol,kol_airdrop_amount_sol,winning_kol_bonus_amount_sol,buyback_burn_amount_sol,finals_vault_amount_sol,tx_status,ready_at,completed_at,tx_signatures,failed_reason",
    )
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    throw error;
  }

  return ((data ?? []) as DistributionRow[]).map(toPayoutTransaction);
}

export async function fetchCurrentRaceFeed(): Promise<RaceFeed | null> {
  if (!client) {
    return null;
  }

  const [kols, liveRace, scheduledRaces, payoutTransactions] = await Promise.all([
    fetchKols(),
    fetchLiveRace(),
    fetchUpcomingRaces(),
    fetchPayoutTransactions(),
  ]);
  const race = liveRace ?? scheduledRaces[0] ?? null;

  return {
    race,
    kols,
    upcomingRaces: liveRace ? scheduledRaces : scheduledRaces.slice(1),
    payoutTransactions,
    isLiveRaceActive: race?.status === "live",
    isConfigured: true,
  };
}
