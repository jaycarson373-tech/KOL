import { config } from "../config.js";
import { round } from "../math.js";
import type { Distribution, RaceIntervalRecord } from "../types.js";
import type { SupabaseRepository } from "../repositories/supabase-repository.js";

const split = {
  winnerHolders: 0.5,
  kolAirdrop: 0.2,
  winningKolBonus: 0.1,
  buybackBurn: 0.1,
  finalsVault: 0.1,
};

export function createDistributionForRace(race: RaceIntervalRecord, now = new Date()): Distribution | null {
  if (!race.winnerKolId) {
    return null;
  }

  const total = Math.max(0, race.kolFeesSol + race.entrantFeesSol);
  const createdAt = now.toISOString();

  return {
    id: `distribution-${race.id}`,
    raceId: race.id,
    winningKolId: race.winnerKolId,
    winnerHoldersAmountSol: round(total * split.winnerHolders, 9),
    kolAirdropAmountSol: round(total * split.kolAirdrop, 9),
    winningKolBonusAmountSol: round(total * split.winningKolBonus, 9),
    buybackBurnAmountSol: round(total * split.buybackBurn, 9),
    finalsVaultAmountSol: round(total * split.finalsVault, 9),
    txStatus: "queued",
    readyAt: new Date(now.getTime() + config.distributionReadyDelayMs).toISOString(),
    createdAt,
    completedAt: null,
    payoutPlan: null,
    txSignatures: [],
    failedReason: null,
  };
}

export async function queueDistribution(repo: SupabaseRepository, race: RaceIntervalRecord, now = new Date()): Promise<void> {
  const existing = await repo.getDistribution(`distribution-${race.id}`);
  if (existing) {
    return;
  }

  const distribution = createDistributionForRace(race, now);
  if (!distribution) {
    return;
  }

  await repo.upsertDistribution(distribution);
  await repo.appendLog("info", "Distribution queued", {
    raceId: race.id,
    winningKolId: race.winnerKolId,
    readyAt: distribution.readyAt,
  });
}

export async function markReadyDistributions(repo: SupabaseRepository, now = new Date()): Promise<void> {
  const distributions = await repo.getDistributions();

  for (const distribution of distributions) {
    if (distribution.txStatus === "queued" && new Date(distribution.readyAt) <= now) {
      await repo.upsertDistribution({ ...distribution, txStatus: "ready" });
      await repo.appendLog("info", "Distribution ready for payout", { distributionId: distribution.id });
    }
  }
}
