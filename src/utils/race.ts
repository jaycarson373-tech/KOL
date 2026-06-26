import type { KolProfile, PrizeSplit, RaceEntrant, RaceInterval } from "../types";

export const prizeSplit: PrizeSplit = {
  winnerHolders: 0.5,
  kolAirdrop: 0.2,
  buybackBurn: 0.15,
  finalsVault: 0.15,
};

export const formatCompactUsd = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);

export const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);

export const formatSol = (value: number) =>
  `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)} SOL`;

export const getInitials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

export const buildEntrants = (
  race: RaceInterval,
  profiles: KolProfile[],
  liveCaps: Record<string, number>,
): RaceEntrant[] => {
  const selected = race.entrants
    .map((id) => profiles.find((profile) => profile.id === id))
    .filter((profile): profile is KolProfile => Boolean(profile))
    .map((profile) => ({
      ...profile,
      marketCapUsd: liveCaps[profile.id] ?? profile.marketCapUsd,
    }));

  const max = Math.max(...selected.map((profile) => profile.marketCapUsd), 1);
  const min = Math.min(...selected.map((profile) => profile.marketCapUsd), max);
  const spread = Math.max(max - min, 1);

  return selected
    .map((profile) => {
      const normalized = (profile.marketCapUsd - min) / spread;
      const progress = 42 + normalized * 40;

      return {
        ...profile,
        progress: Number(progress.toFixed(2)),
        rank: 0,
      };
    })
    .sort((a, b) => b.marketCapUsd - a.marketCapUsd)
    .map((entrant, index) => ({ ...entrant, rank: index + 1 }));
};

export const getRacePot = (race: RaceInterval) =>
  race.kolFeesSol + race.entrantFeesSol;

export const getSplitAmounts = (race: RaceInterval) => {
  const pot = getRacePot(race);

  return {
    winnerHolders: pot * prizeSplit.winnerHolders,
    kolAirdrop: pot * prizeSplit.kolAirdrop,
    buybackBurn: pot * prizeSplit.buybackBurn,
    finalsVault: pot * prizeSplit.finalsVault,
  };
};

export const getCountdownParts = (endsAt: string) => {
  const diff = Math.max(new Date(endsAt).getTime() - Date.now(), 0);
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);

  return {
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
  };
};
