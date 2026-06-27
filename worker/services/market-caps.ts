import { config } from "../config.js";
import type { Kol, MarketCapSnapshot, RaceIntervalRecord, RaceSnapshot } from "../types.js";

type DexPair = {
  chainId?: string;
  baseToken?: {
    address?: string;
  };
  priceUsd?: string;
  marketCap?: number;
  fdv?: number;
};

type DexResponse = {
  pairs?: DexPair[];
};

type HeliusAssetPayload = {
  result?: {
    token_info?: {
      price_info?: {
        price_per_token?: number;
        total_price?: number;
      };
      supply?: number;
    };
  };
};

async function fetchProviderMarketCap(kol: Kol): Promise<MarketCapSnapshot | null> {
  if (!config.marketCapApiUrl || !kol.tokenMint) {
    return null;
  }

  const url = new URL(config.marketCapApiUrl);
  url.searchParams.set("mint", kol.tokenMint);

  const response = await fetch(url, {
    headers: config.marketCapApiKey ? { authorization: `Bearer ${config.marketCapApiKey}` } : undefined,
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    data?: Record<string, { marketCap?: number; price?: number }>;
    marketCap?: number;
    price?: number;
  };
  const direct = payload.data?.[kol.tokenMint] ?? payload;
  const marketCap = direct.marketCap ?? (direct.price ? direct.price * config.tokenFixedSupply : null);

  if (!marketCap || !Number.isFinite(marketCap)) {
    return null;
  }

  return {
    marketCapUsd: marketCap,
    priceUsd: direct.price ?? null,
    source: "helius",
    recordedAt: new Date().toISOString(),
  };
}

async function fetchDexScreenerMarketCap(kol: Kol): Promise<MarketCapSnapshot | null> {
  if (!kol.tokenMint) {
    return null;
  }

  const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${kol.tokenMint}`);
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as DexResponse;
  const pair = (payload.pairs ?? [])
    .filter((item) => item.chainId === "solana" && item.baseToken?.address?.toLowerCase() === kol.tokenMint?.toLowerCase())
    .sort((left, right) => (right.marketCap ?? right.fdv ?? 0) - (left.marketCap ?? left.fdv ?? 0))[0];

  const price = pair?.priceUsd ? Number(pair.priceUsd) : null;
  const marketCap = pair?.marketCap ?? pair?.fdv ?? (price ? price * config.tokenFixedSupply : null);
  if (!marketCap || !Number.isFinite(marketCap)) {
    return null;
  }

  return {
    marketCapUsd: marketCap,
    priceUsd: price && Number.isFinite(price) ? price : null,
    source: "dexscreener",
    recordedAt: new Date().toISOString(),
  };
}

function getHeliusRpcUrl(): string | null {
  if (!config.heliusApiKey && !config.heliusRpcUrl) {
    return null;
  }

  const url = new URL(config.heliusRpcUrl ?? "https://mainnet.helius-rpc.com/");
  if (config.heliusApiKey && !url.searchParams.has("api-key")) {
    url.searchParams.set("api-key", config.heliusApiKey);
  }

  return url.toString();
}

async function fetchHeliusMarketCap(kol: Kol): Promise<MarketCapSnapshot | null> {
  const rpcUrl = getHeliusRpcUrl();
  if (!rpcUrl || !kol.tokenMint) {
    return null;
  }

  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `kol-asset-${kol.id}`,
      method: "getAsset",
      params: { id: kol.tokenMint },
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as HeliusAssetPayload;
  const price = payload.result?.token_info?.price_info?.price_per_token ?? null;
  const supply = payload.result?.token_info?.supply ?? config.tokenFixedSupply;
  const marketCap = price ? price * supply : payload.result?.token_info?.price_info?.total_price;

  if (!marketCap || !Number.isFinite(marketCap)) {
    return null;
  }

  return {
    marketCapUsd: marketCap,
    priceUsd: price,
    source: "helius",
    recordedAt: new Date().toISOString(),
  };
}

async function getKolMarketCap(kol: Kol): Promise<MarketCapSnapshot> {
  const live =
    (await fetchProviderMarketCap(kol).catch(() => null)) ??
    (await fetchHeliusMarketCap(kol).catch(() => null)) ??
    (await fetchDexScreenerMarketCap(kol).catch(() => null));

  if (live) {
    return live;
  }

  return {
    marketCapUsd: kol.fallbackMarketCapUsd,
    priceUsd: null,
    source: "fallback",
    recordedAt: new Date().toISOString(),
  };
}

export async function getMarketCapSnapshot(kols: Kol[], race: RaceIntervalRecord): Promise<RaceSnapshot> {
  const byId = new Map(kols.map((kol) => [kol.id, kol]));
  const entrants = race.entrantIds.map((id) => byId.get(id)).filter((kol): kol is Kol => Boolean(kol));
  const entries = await Promise.all(entrants.map(async (kol) => [kol.id, await getKolMarketCap(kol)] as const));
  return Object.fromEntries(entries);
}

export function getWinnerFromSnapshot(race: RaceIntervalRecord, snapshot: RaceSnapshot): string | null {
  return race.entrantIds
    .map((id) => ({ id, marketCap: snapshot[id]?.marketCapUsd ?? 0 }))
    .sort((left, right) => right.marketCap - left.marketCap)[0]?.id ?? null;
}
