import { activeRace, kols, upcomingRaces } from "../src/data/kols.js";
import type { RaceStatus } from "../src/types.js";
import { getRepository } from "../worker/repositories/supabase-repository.js";
import type { RaceIntervalRecord } from "../worker/types.js";

function toWorkerStatus(status: RaceStatus): RaceIntervalRecord["status"] {
  if (status === "live") {
    return "live";
  }

  if (status === "final") {
    return "completed";
  }

  return "scheduled";
}

async function main() {
  const repo = getRepository();

  for (const kol of kols) {
    await repo.upsertKol({
      id: kol.id,
      name: kol.name,
      symbol: kol.symbol,
      xHandle: kol.xHandle,
      xUrl: kol.xUrl,
      avatarUrl: kol.avatarUrl ?? null,
      tokenMint: kol.contractAddress ?? null,
      marketUrl: kol.marketUrl ?? null,
      terminalUrl: kol.terminalUrl ?? null,
      feeWallet: null,
      wins: kol.wins,
      losses: kol.losses,
      seed: kol.seed,
      color: kol.color,
      fallbackMarketCapUsd: kol.marketCapUsd,
    });
  }

  for (const race of [activeRace, ...upcomingRaces]) {
    await repo.upsertRace({
      id: race.id,
      label: race.label,
      status: toWorkerStatus(race.status),
      startsAt: race.startsAt,
      endsAt: race.endsAt,
      entrantIds: race.entrants,
      snapshotStart: null,
      snapshotEnd: null,
      liveMarketCaps: null,
      winnerKolId: null,
      kolFeesSol: race.kolFeesSol,
      entrantFeesSol: race.entrantFeesSol,
      distributionComplete: false,
    });
  }

  await repo.appendLog("info", "Seeded KOL tournament worker data", {
    kols: kols.length,
    races: 1 + upcomingRaces.length,
  });
  console.log(`[kol] seeded ${kols.length} KOLs and ${1 + upcomingRaces.length} races`);
}

main().catch((error) => {
  console.error("[kol] seed failed", error);
  process.exit(1);
});
