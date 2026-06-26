import type { KolProfile } from "../types";

interface DexPair {
  baseToken?: {
    address?: string;
  };
  marketCap?: number;
  fdv?: number;
}

interface DexResponse {
  pairs?: DexPair[];
}

const DEXSCREENER_BATCH_SIZE = 28;

export const liveMarketCapsEnabled =
  import.meta.env.VITE_ENABLE_LIVE_MARKET_CAPS === "true";

export async function fetchLiveMarketCaps(
  profiles: KolProfile[],
): Promise<Record<string, number>> {
  if (!liveMarketCapsEnabled) {
    return {};
  }

  const withAddresses = profiles.filter((profile) => profile.contractAddress);
  const result: Record<string, number> = {};

  for (let i = 0; i < withAddresses.length; i += DEXSCREENER_BATCH_SIZE) {
    const batch = withAddresses.slice(i, i + DEXSCREENER_BATCH_SIZE);
    const addresses = batch.map((profile) => profile.contractAddress).join(",");
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${addresses}`,
    );

    if (!response.ok) {
      continue;
    }

    const payload = (await response.json()) as DexResponse;
    const pairs = payload.pairs ?? [];

    for (const profile of batch) {
      const address = profile.contractAddress?.toLowerCase();
      const pair = pairs
        .filter((item) => item.baseToken?.address?.toLowerCase() === address)
        .sort((a, b) => (b.marketCap ?? b.fdv ?? 0) - (a.marketCap ?? a.fdv ?? 0))[0];

      const marketCap = pair?.marketCap ?? pair?.fdv;
      if (marketCap) {
        result[profile.id] = marketCap;
      }
    }
  }

  return result;
}

export async function fetchHeliusAsset(contractAddress: string) {
  const apiKey = import.meta.env.VITE_HELIUS_API_KEY;

  if (!apiKey) {
    return null;
  }

  const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "kol-token-asset",
      method: "getAsset",
      params: {
        id: contractAddress,
      },
    }),
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}
