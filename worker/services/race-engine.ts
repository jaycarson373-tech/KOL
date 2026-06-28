import { config } from "../config.js";
import type { Kol, RaceIntervalRecord } from "../types.js";
import { getRepository, type SupabaseRepository } from "../repositories/supabase-repository.js";
import { markReadyDistributions, queueDistribution } from "./distributions.js";
import { getMarketCapSnapshot, getWinnerFromSnapshot } from "./market-caps.js";
import { captureRaceHolderSnapshots, executeReadyDistributions } from "./payouts.js";

function kolsForRace(race: RaceIntervalRecord, kols: Kol[]): Kol[] {
  const byId = new Map(kols.map((kol) => [kol.id, kol]));
  return race.entrantIds.map((id) => byId.get(id)).filter((kol): kol is Kol => Boolean(kol));
}

async function startRace(repo: SupabaseRepository, race: RaceIntervalRecord, entrants: Kol[]): Promise<void> {
  const snapshotStart = race.snapshotStart ?? (await getMarketCapSnapshot(entrants, race));
  const liveMarketCaps = await getMarketCapSnapshot(entrants, race);

  await repo.upsertRace({
    ...race,
    snapshotStart,
    liveMarketCaps,
    status: "live",
  });
  await repo.appendLog("info", "Race started", { raceId: race.id, label: race.label });
}

async function updateLiveRace(repo: SupabaseRepository, race: RaceIntervalRecord, entrants: Kol[], now: Date): Promise<void> {
  const firstEntrant = race.entrantIds[0];
  const lastRecorded = firstEntrant ? race.liveMarketCaps?.[firstEntrant]?.recordedAt : null;
  const shouldRefresh = !lastRecorded || now.getTime() - new Date(lastRecorded).getTime() >= config.liveRefreshMs;

  if (!shouldRefresh) {
    return;
  }

  await repo.upsertRace({
    ...race,
    liveMarketCaps: await getMarketCapSnapshot(entrants, race),
    status: "live",
  });
}

async function completeRace(repo: SupabaseRepository, race: RaceIntervalRecord, entrants: Kol[]): Promise<void> {
  if (race.status === "completed") {
    return;
  }

  const snapshotStart = race.snapshotStart ?? (await getMarketCapSnapshot(entrants, race));
  const snapshotEnd = race.snapshotEnd ?? (await getMarketCapSnapshot(entrants, race));
  const winnerKolId = race.winnerKolId ?? getWinnerFromSnapshot({ ...race, snapshotStart }, snapshotEnd);
  const next: RaceIntervalRecord = {
    ...race,
    snapshotStart,
    snapshotEnd,
    liveMarketCaps: snapshotEnd,
    winnerKolId,
    status: "completed",
  };

  await captureRaceHolderSnapshots(repo, next, entrants);
  await repo.upsertRace(next);
  await queueDistribution(repo, next, new Date(race.endsAt));
  await repo.appendLog("info", "Race completed", { raceId: race.id, label: race.label, winnerKolId });
}

export async function runRaceEngineTick(options: { repo?: SupabaseRepository; now?: Date; source?: string } = {}): Promise<void> {
  const repo = options.repo ?? getRepository();
  const now = options.now ?? new Date();
  const [kols, races] = await Promise.all([repo.getKols(), repo.getRaces()]);

  for (const race of races) {
    if (race.status === "paused" || race.status === "completed") {
      continue;
    }

    const startsAt = new Date(race.startsAt);
    const endsAt = new Date(race.endsAt);
    const entrants = kolsForRace(race, kols);

    if (now >= endsAt) {
      await completeRace(repo, race, entrants);
      continue;
    }

    if (now >= startsAt && now < endsAt) {
      if (race.status === "scheduled") {
        await startRace(repo, race, entrants);
      } else {
        await updateLiveRace(repo, race, entrants, now);
      }
    }
  }

  await markReadyDistributions(repo, now);
  await executeReadyDistributions(repo);

  if (options.source === "worker") {
    await repo.appendLog("info", "Worker tick complete", { checkedAt: now.toISOString() });
  }
}
