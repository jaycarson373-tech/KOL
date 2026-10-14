import assert from "node:assert/strict";
import test from "node:test";
import type { RaceIntervalRecord, RaceSnapshot } from "../types.js";
import { getWinnerFromSnapshot, hasCompleteLiveSnapshot } from "./market-caps.js";

const race: RaceIntervalRecord = {
  id: "race-1",
  label: "Race 1",
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

function snapshot(a: number, b: number, source: "helius" | "dexscreener" | "fallback" = "dexscreener"): RaceSnapshot {
  return Object.fromEntries(
    Object.entries({ a, b }).map(([id, marketCapUsd]) => [id, {
      marketCapUsd,
      priceUsd: null,
      source,
      recordedAt: "2026-10-13T12:30:00.000Z",
    }]),
  );
}

test("complete positive live snapshots are eligible for scoring", () => {
  assert.equal(hasCompleteLiveSnapshot(race.entrantIds, snapshot(100, 200)), true);
});

test("missing, zero, and fallback values are not eligible for scoring", () => {
  assert.equal(hasCompleteLiveSnapshot(race.entrantIds, { a: snapshot(100, 200).a }), false);
  assert.equal(hasCompleteLiveSnapshot(race.entrantIds, snapshot(100, 0)), false);
  assert.equal(hasCompleteLiveSnapshot(race.entrantIds, snapshot(100, 200, "fallback")), false);
});

test("winner is selected by percentage market-cap growth only with complete live data", () => {
  const start = snapshot(100, 200);
  const end = snapshot(150, 260);
  assert.equal(getWinnerFromSnapshot({ ...race, snapshotStart: start }, end), "a");
  assert.equal(getWinnerFromSnapshot({ ...race, snapshotStart: start }, { a: end.a }), null);
});
