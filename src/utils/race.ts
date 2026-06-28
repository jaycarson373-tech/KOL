import type { KolProfile, PrizeSplit, RaceEntrant, RaceInterval } from "../types";

export const prizeSplit: PrizeSplit = {
  winnerHolders: 0.5,
  kolAirdrop: 0.2,
  winningKolBonus: 0.1,
  buybackBurn: 0.1,
  finalsVault: 0.1,
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

export const formatPercentChange = (value: number) =>
  `${value > 0 ? "+" : ""}${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}%`;

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
  isLiveRaceActive: boolean,
): RaceEntrant[] => {
  const selected = race.entrants
    .map((id) => profiles.find((profile) => profile.id === id))
    .filter((profile): profile is KolProfile => Boolean(profile))
    .map((profile) => {
      const startMarketCapUsd =
        race.snapshotStart?.[profile.id]?.marketCapUsd ?? profile.marketCapUsd;
      const marketCapUsd =
        race.liveMarketCaps?.[profile.id]?.marketCapUsd ??
        race.snapshotEnd?.[profile.id]?.marketCapUsd ??
        startMarketCapUsd;
      const percentChange =
        isLiveRaceActive && startMarketCapUsd > 0
          ? ((marketCapUsd - startMarketCapUsd) / startMarketCapUsd) * 100
          : 0;

      return {
        ...profile,
        startMarketCapUsd,
        marketCapUsd,
        percentChange: Number(percentChange.toFixed(4)),
        progress: 12,
        rank: 0,
        isLeader: false,
      };
    });

  const ranked = selected
    .slice()
    .sort(
      (a, b) =>
        b.percentChange - a.percentChange ||
        b.marketCapUsd - a.marketCapUsd ||
        a.seed - b.seed,
    );
  const rankById = new Map(ranked.map((entrant, index) => [entrant.id, index + 1]));
  const changes = selected.map((entrant) => entrant.percentChange);
  const max = Math.max(...changes, 0);
  const min = Math.min(...changes, 0);
  const allCarsAtStart = !isLiveRaceActive || changes.every((change) => change === 0);
  const spread = Math.max(max - min, 0);

  return selected
    .map((entrant) => {
      const normalized = allCarsAtStart || spread === 0 ? 0 : (entrant.percentChange - min) / spread;
      const progress = allCarsAtStart ? 12 : 14 + normalized * 74;
      const rank = rankById.get(entrant.id) ?? 0;

      return {
        ...entrant,
        progress: Number(progress.toFixed(2)),
        rank,
        isLeader: isLiveRaceActive && !allCarsAtStart && rank === 1,
      };
    })
    .sort((a, b) => a.rank - b.rank);
};

export const getRacePot = (race: RaceInterval) =>
  race.kolFeesSol + race.entrantFeesSol;

export const getSplitAmounts = (race: RaceInterval) => {
  const pot = getRacePot(race);

  return {
    winnerHolders: pot * prizeSplit.winnerHolders,
    kolAirdrop: pot * prizeSplit.kolAirdrop,
    winningKolBonus: pot * prizeSplit.winningKolBonus,
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
