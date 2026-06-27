import { getSupabaseAdmin } from "../supabase.js";
import type {
  Distribution,
  HolderSnapshot,
  Kol,
  PayoutPlan,
  RaceIntervalRecord,
  RaceSnapshot,
  TokenHolderBalance,
} from "../types.js";

type KolRow = {
  id: string;
  name: string;
  symbol: string;
  x_handle: string;
  x_url: string;
  avatar_url: string | null;
  token_mint: string | null;
  market_url: string | null;
  terminal_url: string | null;
  fee_wallet: string | null;
  wins: number;
  losses: number;
  seed: number;
  color: string;
  fallback_market_cap_usd: number;
};

type RaceRow = {
  id: string;
  label: string;
  status: RaceIntervalRecord["status"];
  starts_at: string;
  ends_at: string;
  entrant_ids: string[];
  snapshot_start: RaceSnapshot | null;
  snapshot_end: RaceSnapshot | null;
  live_market_caps: RaceSnapshot | null;
  winner_kol_id: string | null;
  kol_fees_sol: number;
  entrant_fees_sol: number;
  distribution_complete: boolean;
};

type DistributionRow = {
  id: string;
  race_id: string;
  winning_kol_id: string;
  winner_holders_amount_sol: number;
  kol_airdrop_amount_sol: number;
  buyback_burn_amount_sol: number;
  finals_vault_amount_sol: number;
  tx_status: Distribution["txStatus"];
  ready_at: string;
  created_at: string;
  completed_at: string | null;
  payout_plan: PayoutPlan | null;
  tx_signatures: string[];
  failed_reason: string | null;
};

function toKol(row: KolRow): Kol {
  return {
    id: row.id,
    name: row.name,
    symbol: row.symbol,
    xHandle: row.x_handle,
    xUrl: row.x_url,
    avatarUrl: row.avatar_url,
    tokenMint: row.token_mint,
    marketUrl: row.market_url,
    terminalUrl: row.terminal_url,
    feeWallet: row.fee_wallet,
    wins: row.wins,
    losses: row.losses,
    seed: row.seed,
    color: row.color,
    fallbackMarketCapUsd: Number(row.fallback_market_cap_usd),
  };
}

function fromKol(kol: Kol): KolRow {
  return {
    id: kol.id,
    name: kol.name,
    symbol: kol.symbol,
    x_handle: kol.xHandle,
    x_url: kol.xUrl,
    avatar_url: kol.avatarUrl,
    token_mint: kol.tokenMint,
    market_url: kol.marketUrl,
    terminal_url: kol.terminalUrl,
    fee_wallet: kol.feeWallet,
    wins: kol.wins,
    losses: kol.losses,
    seed: kol.seed,
    color: kol.color,
    fallback_market_cap_usd: kol.fallbackMarketCapUsd,
  };
}

function toRace(row: RaceRow): RaceIntervalRecord {
  return {
    id: row.id,
    label: row.label,
    status: row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    entrantIds: row.entrant_ids,
    snapshotStart: row.snapshot_start,
    snapshotEnd: row.snapshot_end,
    liveMarketCaps: row.live_market_caps,
    winnerKolId: row.winner_kol_id,
    kolFeesSol: Number(row.kol_fees_sol),
    entrantFeesSol: Number(row.entrant_fees_sol),
    distributionComplete: row.distribution_complete,
  };
}

function fromRace(race: RaceIntervalRecord): RaceRow {
  return {
    id: race.id,
    label: race.label,
    status: race.status,
    starts_at: race.startsAt,
    ends_at: race.endsAt,
    entrant_ids: race.entrantIds,
    snapshot_start: race.snapshotStart,
    snapshot_end: race.snapshotEnd,
    live_market_caps: race.liveMarketCaps,
    winner_kol_id: race.winnerKolId,
    kol_fees_sol: race.kolFeesSol,
    entrant_fees_sol: race.entrantFeesSol,
    distribution_complete: race.distributionComplete,
  };
}

function toDistribution(row: DistributionRow): Distribution {
  return {
    id: row.id,
    raceId: row.race_id,
    winningKolId: row.winning_kol_id,
    winnerHoldersAmountSol: Number(row.winner_holders_amount_sol),
    kolAirdropAmountSol: Number(row.kol_airdrop_amount_sol),
    buybackBurnAmountSol: Number(row.buyback_burn_amount_sol),
    finalsVaultAmountSol: Number(row.finals_vault_amount_sol),
    txStatus: row.tx_status,
    readyAt: row.ready_at,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    payoutPlan: row.payout_plan,
    txSignatures: row.tx_signatures ?? [],
    failedReason: row.failed_reason,
  };
}

function fromDistribution(distribution: Distribution): DistributionRow {
  return {
    id: distribution.id,
    race_id: distribution.raceId,
    winning_kol_id: distribution.winningKolId,
    winner_holders_amount_sol: distribution.winnerHoldersAmountSol,
    kol_airdrop_amount_sol: distribution.kolAirdropAmountSol,
    buyback_burn_amount_sol: distribution.buybackBurnAmountSol,
    finals_vault_amount_sol: distribution.finalsVaultAmountSol,
    tx_status: distribution.txStatus,
    ready_at: distribution.readyAt,
    created_at: distribution.createdAt,
    completed_at: distribution.completedAt,
    payout_plan: distribution.payoutPlan,
    tx_signatures: distribution.txSignatures,
    failed_reason: distribution.failedReason,
  };
}

export class SupabaseRepository {
  private readonly client = getSupabaseAdmin();

  async getKols(): Promise<Kol[]> {
    const { data, error } = await this.client.from("kols").select("*").order("seed", { ascending: true });
    if (error) throw error;
    return ((data ?? []) as KolRow[]).map(toKol);
  }

  async getKol(id: string): Promise<Kol | null> {
    const { data, error } = await this.client.from("kols").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? toKol(data as KolRow) : null;
  }

  async upsertKol(kol: Kol): Promise<void> {
    const { error } = await this.client.from("kols").upsert(fromKol(kol));
    if (error) throw error;
  }

  async getRaces(): Promise<RaceIntervalRecord[]> {
    const { data, error } = await this.client.from("race_intervals").select("*").order("starts_at", { ascending: true });
    if (error) throw error;
    return ((data ?? []) as RaceRow[]).map(toRace);
  }

  async getRace(id: string): Promise<RaceIntervalRecord | null> {
    const { data, error } = await this.client.from("race_intervals").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? toRace(data as RaceRow) : null;
  }

  async upsertRace(race: RaceIntervalRecord): Promise<void> {
    const { error } = await this.client.from("race_intervals").upsert(fromRace(race));
    if (error) throw error;
  }

  async getDistribution(id: string): Promise<Distribution | null> {
    const { data, error } = await this.client.from("distributions").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? toDistribution(data as DistributionRow) : null;
  }

  async getDistributions(): Promise<Distribution[]> {
    const { data, error } = await this.client.from("distributions").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return ((data ?? []) as DistributionRow[]).map(toDistribution);
  }

  async upsertDistribution(distribution: Distribution): Promise<void> {
    const { error } = await this.client.from("distributions").upsert(fromDistribution(distribution));
    if (error) throw error;
  }

  async insertHolderSnapshot(snapshot: HolderSnapshot): Promise<void> {
    const { error } = await this.client.from("holder_snapshots").upsert({
      id: snapshot.id,
      race_id: snapshot.raceId,
      mint: snapshot.mint,
      kind: snapshot.kind,
      captured_at: snapshot.capturedAt,
      holder_count: snapshot.holderCount,
      total_token_amount: snapshot.totalTokenAmount,
      holders: snapshot.holders,
    });
    if (error) throw error;
  }

  async appendLog(level: "info" | "warn" | "error", message: string, metadata: Record<string, unknown> = {}): Promise<void> {
    const { error } = await this.client.from("system_logs").insert({ level, message, metadata });
    if (error) throw error;
  }
}

let repository: SupabaseRepository | null = null;

export function getRepository(): SupabaseRepository {
  repository ??= new SupabaseRepository();
  return repository;
}
