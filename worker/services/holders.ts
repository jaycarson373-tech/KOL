import { config } from "../config.js";
import type { TokenHolderBalance } from "../types.js";

type RpcPayload<T> = {
  result?: T;
  error?: {
    message?: string;
  };
};

type TokenSupplyResult = {
  value?: {
    amount?: string;
    decimals?: number;
  };
};

type HeliusTokenAccount = {
  owner?: string;
  amount?: number | string;
  token_amount?: number | string;
  tokenAmount?: number | string;
  uiAmount?: number | string;
};

type HeliusTokenAccountsResult = {
  cursor?: string;
  total?: number;
  token_accounts?: HeliusTokenAccount[];
  tokenAccounts?: HeliusTokenAccount[];
};

function getRpcUrl(): string {
  const url = new URL(config.heliusRpcUrl ?? config.solanaRpcUrl ?? "https://mainnet.helius-rpc.com/");

  if (config.heliusApiKey && !url.searchParams.has("api-key")) {
    url.searchParams.set("api-key", config.heliusApiKey);
  }

  return url.toString();
}

function assertHolderRpcConfigured(): void {
  if (!config.heliusApiKey && !config.heliusRpcUrl && !config.solanaRpcUrl) {
    throw new Error("Holder snapshots require HELIUS_API_KEY, HELIUS_RPC_URL, or SOLANA_RPC_URL.");
  }
}

async function rpc<T>(method: string, params: unknown): Promise<T> {
  assertHolderRpcConfigured();

  const response = await fetch(getRpcUrl(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `kol-${method}`,
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`Helius RPC ${method} failed with HTTP ${response.status}`);
  }

  const payload = (await response.json()) as RpcPayload<T>;
  if (payload.error) {
    throw new Error(payload.error.message ?? `Helius RPC ${method} failed`);
  }

  if (!payload.result) {
    throw new Error(`Helius RPC ${method} returned no result`);
  }

  return payload.result;
}

async function getTokenDecimals(mint: string): Promise<number> {
  const result = await rpc<TokenSupplyResult>("getTokenSupply", [mint]);
  return result.value?.decimals ?? 0;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function accountAmount(account: HeliusTokenAccount, decimals: number): number {
  const uiAmount = toFiniteNumber(account.uiAmount);
  if (uiAmount !== null) {
    return uiAmount;
  }

  const raw = toFiniteNumber(account.amount ?? account.token_amount ?? account.tokenAmount);
  if (raw === null) {
    return 0;
  }

  return raw / 10 ** decimals;
}

export async function getTokenHolderBalances(mint: string): Promise<TokenHolderBalance[]> {
  const decimals = await getTokenDecimals(mint);
  const balances = new Map<string, number>();
  let cursor: string | undefined;
  let page = 1;

  do {
    const params: Record<string, unknown> = {
      mint,
      limit: 1000,
    };

    if (cursor) {
      params.cursor = cursor;
    } else {
      params.page = page;
    }

    const result = await rpc<HeliusTokenAccountsResult>("getTokenAccounts", params);
    const accounts = result.token_accounts ?? result.tokenAccounts ?? [];

    for (const account of accounts) {
      if (!account.owner) {
        continue;
      }

      const amount = accountAmount(account, decimals);
      if (amount <= 0) {
        continue;
      }

      balances.set(account.owner, (balances.get(account.owner) ?? 0) + amount);
    }

    cursor = result.cursor;
    page += 1;

    if (!cursor && result.total && page * 1000 <= result.total) {
      continue;
    }

    if (!cursor) {
      break;
    }
  } while (page <= 200);

  return [...balances.entries()]
    .map(([owner, amount]) => ({ owner, amount }))
    .sort((left, right) => right.amount - left.amount);
}
