import assert from "node:assert/strict";
import test from "node:test";
import type { Kol, RaceIntervalRecord } from "../types.js";
import type { SupabaseRepository } from "../repositories/supabase-repository.js";
import { runRaceEngineTick } from "./race-engine.js";

test("an ended race with fallback price data is not finalized or distributed", async () => {
  const now = new Date("2026-10-13T14:00:00.000Z");
  const race: RaceIntervalRecord = {
    id: "race-missing-prices",
    label: "Missing prices",
    status: "live",
    startsAt: "2026-10-13T12:00:00.000Z",
    endsAt: "2026-10-13T13:00:00.000Z",
    entrantIds: ["a", "b"],
    snapshotStart: null,
    snapshotEnd: null,
    liveMarketCaps: null,
    winnerKolId: null,
    kolFeesSol: 0,
    entrantFeesSol: 0,
    distributionComplete: false,
  };
  const kols: Kol[] = race.entrantIds.map((id, seed) => ({
    id,
    name: id.toUpperCase(),
    symbol: `$${id.toUpperCase()}`,
    xHandle: `@${id}`,
    xUrl: `https://x.com/${id}`,
    avatarUrl: null,
    tokenMint: null,
    marketUrl: null,
    terminalUrl: null,
    feeWallet: null,
    wins: 0,
    losses: 0,
    seed,
    color: "#000000",
    fallbackMarketCapUsd: 0,
  }));
  const calls: string[] = [];
  const repo = {
    getKols: async () => kols,
    getRaces: async () => [race],
    getDistributions: async () => [],
    appendLog: async (_level: string, message: string) => { calls.push(`log:${message}`); },
    upsertRace: async () => { calls.push("upsertRace"); },
    getHolderSnapshotsForRace: async () => { calls.push("captureHolders"); return []; },
    insertHolderSnapshot: async () => { calls.push("insertHolderSnapshot"); },
    getDistribution: async () => null,
    upsertDistribution: async () => { calls.push("upsertDistribution"); },
  } as unknown as SupabaseRepository;

  await runRaceEngineTick({ repo, now });

  assert.ok(calls.some((call) => call.startsWith("log:Race not finalized")));
  assert.equal(calls.some((call) => ["upsertRace", "captureHolders", "insertHolderSnapshot", "upsertDistribution"].includes(call)), false);
});
