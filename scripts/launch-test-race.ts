import { PublicKey } from "@solana/web3.js";

import { config } from "../worker/config.js";
import { getRepository } from "../worker/repositories/supabase-repository.js";
import type { Kol, RaceIntervalRecord } from "../worker/types.js";

const testColors = ["#d9b968", "#23d3bd", "#db6d56", "#7f8cff"];

function readList(name: string): string[] {
  return (process.env[name] ?? "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function readNumber(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

function readBoolean(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) {
    return fallback;
  }

  return value === "true" || value === "1" || value === "yes";
}

function validateMint(value: string): string {
  try {
    return new PublicKey(value).toBase58();
  } catch {
    throw new Error(`Invalid Solana token mint: ${value}`);
  }
}

function getTestMints(): string[] {
  const args = process.argv.slice(2);
  const fromArgs = args.filter((arg) => !arg.startsWith("-"));
  const mints = fromArgs.length > 0 ? fromArgs : readList("TEST_KOL_CAS");
  const uniqueMints = [...new Set(mints.map(validateMint))];

  if (uniqueMints.length !== 4) {
    throw new Error("Test launch requires exactly 4 unique token mints via args or TEST_KOL_CAS.");
  }

  return uniqueMints;
}

function buildTestKols(mints: string[]): Kol[] {
  const names = readList("TEST_KOL_NAMES");
  const symbols = readList("TEST_KOL_SYMBOLS");
  const handles = readList("TEST_KOL_X_HANDLES");
  const feeWallets = readList("TEST_KOL_FEE_WALLETS");
  const fallbackCaps = readList("TEST_FALLBACK_MARKET_CAPS_USD").map(Number);

  return mints.map((mint, index) => {
    const number = index + 1;
    const symbol = symbols[index] ?? `$TEST${number}`;
    const handle = handles[index] ?? `testkol${number}`;

    return {
      id: `test-kol-${String(number).padStart(2, "0")}`,
      name: names[index] ?? `Test KOL ${number}`,
      symbol,
      xHandle: handle.startsWith("@") ? handle : `@${handle}`,
      xUrl: `https://x.com/${handle.replace(/^@/, "")}`,
      avatarUrl: null,
      tokenMint: mint,
      marketUrl: `https://dexscreener.com/solana/${mint}`,
      terminalUrl: null,
      feeWallet: feeWallets[index] ? validateMint(feeWallets[index]) : null,
      wins: 0,
      losses: 0,
      seed: 9000 + number,
      color: testColors[index] ?? "#d9b968",
      fallbackMarketCapUsd: Number.isFinite(fallbackCaps[index]) ? fallbackCaps[index] : 100_000 - index * 5_000,
    };
  });
}

function buildTestRace(kols: Kol[]): RaceIntervalRecord {
  const durationMinutes = readNumber("TEST_RACE_DURATION_MINUTES", 30);
  const startDelayMinutes = readNumber("TEST_RACE_START_DELAY_MINUTES", 0);
  const startsAt = new Date(Date.now() + startDelayMinutes * 60_000);
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

  return {
    id: process.env.TEST_RACE_ID?.trim() || `test-race-${startsAt.toISOString().replace(/[-:.]/g, "").slice(0, 15)}`,
    label: process.env.TEST_RACE_LABEL?.trim() || "Test Launch Race · 30 Minutes",
    status: "scheduled",
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    entrantIds: kols.map((kol) => kol.id),
    snapshotStart: null,
    snapshotEnd: null,
    liveMarketCaps: null,
    winnerKolId: null,
    kolFeesSol: readNumber("TEST_KOL_FEES_SOL", 0),
    entrantFeesSol: readNumber("TEST_ENTRANT_FEES_SOL", 0),
    distributionComplete: false,
  };
}

async function pauseOtherOpenRaces(repo: ReturnType<typeof getRepository>, testRaceId: string): Promise<number> {
  if (!readBoolean("TEST_PAUSE_OTHER_RACES", true)) {
    return 0;
  }

  const races = await repo.getRaces();
  const openRaces = races.filter(
    (race) => race.id !== testRaceId && (race.status === "scheduled" || race.status === "live"),
  );

  for (const race of openRaces) {
    await repo.upsertRace({ ...race, status: "paused" });
  }

  return openRaces.length;
}

async function main() {
  if (config.payoutExecutionEnabled && !readBoolean("ALLOW_PAYOUT_EXECUTION_FOR_TEST", false)) {
    throw new Error("Refusing test launch while PAYOUT_EXECUTION_ENABLED is true.");
  }

  const mints = getTestMints();
  const repo = getRepository();
  const kols = buildTestKols(mints);
  const race = buildTestRace(kols);
  const pausedRaces = await pauseOtherOpenRaces(repo, race.id);

  for (const kol of kols) {
    await repo.upsertKol(kol);
  }

  await repo.upsertRace(race);
  await repo.appendLog("info", "Test race launched", {
    raceId: race.id,
    startsAt: race.startsAt,
    endsAt: race.endsAt,
    entrantIds: race.entrantIds,
    tokenMints: mints,
    pausedRaces,
  });

  console.log(`[kol] launched ${race.label}`);
  console.log(`[kol] race id: ${race.id}`);
  console.log(`[kol] starts: ${race.startsAt}`);
  console.log(`[kol] ends:   ${race.endsAt}`);
  console.log(`[kol] entrants: ${kols.map((kol) => `${kol.symbol}:${kol.tokenMint}`).join(", ")}`);
  console.log(`[kol] paused other open races: ${pausedRaces}`);
  console.log("[kol] run `npm run worker:tick` once to start immediately if Railway daemon is not already polling.");
}

main().catch((error) => {
  console.error(`[kol] test launch failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  process.exit(1);
});
