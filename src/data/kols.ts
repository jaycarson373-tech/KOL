import type { KolProfile, RaceInterval, TournamentStats } from "../types";

type OfficialKolSeed = Pick<KolProfile, "name" | "symbol" | "xHandle" | "xUrl" | "avatarUrl" | "color">;

const officialRoster: OfficialKolSeed[] = [
  {
    name: "Ansem",
    symbol: "$ANSEM",
    xHandle: "@blknoiz06",
    xUrl: "https://x.com/blknoiz06",
    avatarUrl: "/kols/01-ansem.jpg",
    color: "#f0b13b",
  },
  {
    name: "Murad",
    symbol: "$MURAD",
    xHandle: "@muststopmurad",
    xUrl: "https://x.com/muststopmurad",
    avatarUrl: "/kols/02-murad.jpg",
    color: "#63c7d7",
  },
  {
    name: "Andrew Tate",
    symbol: "$TATE",
    xHandle: "@cobratate",
    xUrl: "https://x.com/cobratate",
    avatarUrl: "/kols/03-andrew-tate.jpg",
    color: "#d09155",
  },
  {
    name: "Cupsey",
    symbol: "$CUPSEY",
    xHandle: "@cupseyy",
    xUrl: "https://x.com/cupseyy",
    avatarUrl: "/kols/04-cupsey.jpg",
    color: "#ffd24d",
  },
  {
    name: "Quant Kid",
    symbol: "$QUANT",
    xHandle: "@quantgz",
    xUrl: "https://x.com/quantgz",
    avatarUrl: "/kols/05-quant-kid.jpg",
    color: "#73a7ff",
  },
  {
    name: "Frank DeGods",
    symbol: "$FRANK",
    xHandle: "@frankdegods",
    xUrl: "https://x.com/frankdegods",
    avatarUrl: "/kols/06-frank-degods.jpg",
    color: "#f2d88a",
  },
  {
    name: "Orangie",
    symbol: "$ORANGIE",
    xHandle: "@orangie",
    xUrl: "https://x.com/orangie",
    avatarUrl: "/kols/07-orangie.jpg",
    color: "#f58b35",
  },
  {
    name: "Shaams",
    symbol: "$SHAAMS",
    xHandle: "@shaams",
    xUrl: "https://x.com/shaams",
    avatarUrl: "/kols/08-shaams.jpg",
    color: "#5aa7d8",
  },
  {
    name: "The White Whale",
    symbol: "$WHALE",
    xHandle: "@whitewhalelabs",
    xUrl: "https://x.com/whitewhalelabs",
    avatarUrl: "/kols/09-the-white-whale.jpg",
    color: "#9fb8c7",
  },
  {
    name: "Trey",
    symbol: "$TREY",
    xHandle: "@treysocial",
    xUrl: "https://x.com/treysocial",
    avatarUrl: "/kols/10-trey.jpg",
    color: "#a16d45",
  },
  {
    name: "Daumen",
    symbol: "$DAUMEN",
    xHandle: "@daumenxyz",
    xUrl: "https://x.com/daumenxyz",
    avatarUrl: "/kols/11-daumen.jpg",
    color: "#b7ff38",
  },
  {
    name: "TJR",
    symbol: "$TJR",
    xHandle: "@_tjrtrades",
    xUrl: "https://x.com/_tjrtrades",
    avatarUrl: "/kols/12-tjr.jpg",
    color: "#6ab6ff",
  },
  {
    name: "Decu",
    symbol: "$DECU",
    xHandle: "@notdecu",
    xUrl: "https://x.com/notdecu",
    avatarUrl: "/kols/13-decu.jpg",
    color: "#b9b4ff",
  },
  {
    name: "Beanz",
    symbol: "$BEANZ",
    xHandle: "@beanzzsol",
    xUrl: "https://x.com/beanzzsol",
    avatarUrl: "/kols/14-beanz.jpg",
    color: "#e7e7e7",
  },
  {
    name: "Cladz",
    symbol: "$CLADZ",
    xHandle: "@cladzsol",
    xUrl: "https://x.com/cladzsol",
    avatarUrl: "/kols/15-cladz.jpg",
    color: "#4c6670",
  },
  {
    name: "Togi",
    symbol: "$TOGI",
    xHandle: "@shanestoffer",
    xUrl: "https://x.com/shanestoffer",
    avatarUrl: "/kols/16-togi.jpg",
    color: "#6b45df",
  },
  {
    name: "Jack Duval",
    symbol: "$JACK",
    xHandle: "@jackduval",
    xUrl: "https://x.com/jackduval",
    avatarUrl: "/kols/17-jack-duval.jpg",
    color: "#4a9cff",
  },
  {
    name: "Bonk Guy (TheUnipcs)",
    symbol: "$BONK",
    xHandle: "@theunipcs",
    xUrl: "https://x.com/theunipcs",
    avatarUrl: "/kols/18-bonk-guy.jpg",
    color: "#ffca2f",
  },
  {
    name: "Alon",
    symbol: "$ALON",
    xHandle: "@a1lon9",
    xUrl: "https://x.com/a1lon9",
    avatarUrl: "/kols/19-alon.jpg",
    color: "#f2d143",
  },
  {
    name: "Banks",
    symbol: "$BANKS",
    xHandle: "@banks",
    xUrl: "https://x.com/banks",
    avatarUrl: "/kols/20-banks.jpg",
    color: "#d79357",
  },
  {
    name: "Gake",
    symbol: "$GAKE",
    xHandle: "@ga__ke",
    xUrl: "https://x.com/ga__ke",
    avatarUrl: "/kols/21-gake.jpg",
    color: "#ff806a",
  },
  {
    name: "Crash",
    symbol: "$CRASH",
    xHandle: "@crashiusclay69",
    xUrl: "https://x.com/crashiusclay69",
    avatarUrl: "/kols/22-crash.jpg",
    color: "#ff5f88",
  },
  {
    name: "Cooker",
    symbol: "$COOKER",
    xHandle: "@cookerflips",
    xUrl: "https://x.com/cookerflips",
    avatarUrl: "/kols/23-cooker.jpg",
    color: "#bfa4ff",
  },
  {
    name: "Scharo",
    symbol: "$SCHARO",
    xHandle: "@xscharo",
    xUrl: "https://x.com/xscharo?s=21",
    avatarUrl: "/kols/24-scharo.jpg",
    color: "#e28c4d",
  },
  {
    name: "Trader Pow",
    symbol: "$POW",
    xHandle: "@traderpow",
    xUrl: "https://x.com/traderpow",
    avatarUrl: "/kols/25-trader-pow.jpg",
    color: "#2e7dff",
  },
  {
    name: "Thread Guy",
    symbol: "$TG",
    xHandle: "@notthreadguy",
    xUrl: "https://x.com/notthreadguy",
    avatarUrl: "/kols/26-thread-guy.jpg",
    color: "#d6b38c",
  },
  {
    name: "Slingoor",
    symbol: "$SLINGOOR",
    xHandle: "@slingoorio",
    xUrl: "https://x.com/slingoorio",
    avatarUrl: "/kols/27-slingoor.jpg",
    color: "#ffce42",
  },
  {
    name: "Megga",
    symbol: "$MEGGA",
    xHandle: "@megga",
    xUrl: "https://x.com/megga?s=21",
    avatarUrl: "/kols/28-megga.jpg",
    color: "#ffb06b",
  },
  {
    name: "Cented",
    symbol: "$CENTED",
    xHandle: "@flipski77",
    xUrl: "https://x.com/flipski77",
    avatarUrl: "/kols/29-cented.jpg",
    color: "#d9d9ff",
  },
  {
    name: "Bob Lax",
    symbol: "$BOBLAX",
    xHandle: "@kingbtc",
    xUrl: "https://x.com/kingbtc",
    avatarUrl: "/kols/30-bob-lax.jpg",
    color: "#b86345",
  },
  {
    name: "Insentos",
    symbol: "$INSENTOS",
    xHandle: "@insentos",
    xUrl: "https://x.com/insentos",
    avatarUrl: "/kols/31-insentos.jpg",
    color: "#ffbd6a",
  },
  {
    name: "AlxCooks",
    symbol: "$ALX",
    xHandle: "@alxcooks",
    xUrl: "https://x.com/alxcooks?s=21",
    avatarUrl: "/kols/32-alxcooks.jpg",
    color: "#d3523a",
  },
];

export const kols: KolProfile[] = officialRoster.map((kol, index) => ({
  ...kol,
  id: `kol-${String(index + 1).padStart(2, "0")}`,
  wins: 0,
  losses: 0,
  seed: index + 1,
  carNumber: String(index + 1),
  marketCapUsd: 0,
}));

const defaultSeasonOneStartsAt = "2026-06-29T21:01:51.000Z";
const importMetaEnv = (import.meta as { env?: Record<string, string | undefined> }).env;
const configuredSeasonOneStartsAt =
  (typeof process !== "undefined" ? process.env.SEASON_ONE_START_AT : undefined) ||
  importMetaEnv?.VITE_SEASON_ONE_START_AT;
const seasonOneStartsAt = configuredSeasonOneStartsAt || defaultSeasonOneStartsAt;
const roundOneRaceHours = 8;
const raceIntermissionHours = 1;

function addHours(value: string, hours: number): string {
  return new Date(new Date(value).getTime() + hours * 3_600_000).toISOString();
}

function buildRoundOneRace(index: number): RaceInterval {
  const startsAt = addHours(seasonOneStartsAt, index * (roundOneRaceHours + raceIntermissionHours));
  const entrants = kols.slice(index * 4, index * 4 + 4).map((kol) => kol.id);

  return {
    id: `race-${String(index + 1).padStart(2, "0")}`,
    label: `Round 1 · Race ${index + 1}`,
    status: "queued",
    startsAt,
    endsAt: addHours(startsAt, roundOneRaceHours),
    entrants,
    kolFeesSol: 0,
    entrantFeesSol: 0,
  };
}

const roundOneRaces = Array.from({ length: 8 }, (_, index) => buildRoundOneRace(index));

export const activeRace: RaceInterval = roundOneRaces[0];
export const upcomingRaces: RaceInterval[] = roundOneRaces.slice(1);

export const tournamentStats: TournamentStats = {
  totalKolBurned: 0,
  solAirdropped: 0,
  winningKolBonusSol: 0,
  finalsVaultSol: 0,
  totalFeesSol: 0,
};
