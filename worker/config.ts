export function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

function readNumber(name: string, fallback: number): number {
  const raw = readEnv(name);
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readBoolean(name: string, fallback = false): boolean {
  const raw = readEnv(name);
  if (!raw) {
    return fallback;
  }

  return raw === "true" || raw === "1" || raw.toLowerCase() === "yes";
}

export const config = {
  supabaseUrl: readEnv("SUPABASE_URL") ?? readEnv("VITE_SUPABASE_URL"),
  supabaseServiceRoleKey: readEnv("SUPABASE_SERVICE_ROLE_KEY"),
  workerMode: readEnv("WORKER_MODE") ?? "cron",
  workerPollMs: readNumber("WORKER_POLL_MS", 30_000),
  liveRefreshMs: readNumber("LIVE_REFRESH_MS", 30_000),
  distributionReadyDelayMs: readNumber("DISTRIBUTION_READY_DELAY_MS", 5 * 60_000),
  kolMint: readEnv("KOL_MINT") ?? readEnv("VITE_KOL_TOKEN_CA"),
  kolMinHolding: readNumber("KOL_MIN_HOLDING", 0),
  payoutExecutionEnabled: readBoolean("PAYOUT_EXECUTION_ENABLED", false),
  payoutSplitFromClaimWallet: readBoolean("PAYOUT_SPLIT_FROM_CLAIM_WALLET", true),
  payoutBatchSize: readNumber("PAYOUT_BATCH_SIZE", 8),
  minPayoutSol: readNumber("MIN_PAYOUT_SOL", 0.001),
  claimWalletPrivateKey: readEnv("CLAIM_WALLET_PRIVATE_KEY") ?? readEnv("PAYOUT_SIGNER_PRIVATE_KEY"),
  treasuryPrivateKey: readEnv("TREASURY_PRIVATE_KEY"),
  winnerKolRewardVault: readEnv("WINNER_KOL_REWARD_VAULT"),
  kolHolderRewardVault: readEnv("KOL_HOLDER_REWARD_VAULT"),
  buybackBurnWallet: readEnv("BUYBACK_BURN_WALLET"),
  finalsVaultWallet: readEnv("FINALS_VAULT_WALLET"),
  winnerKolRewardPrivateKey: readEnv("WINNER_KOL_REWARD_PRIVATE_KEY"),
  kolHolderRewardPrivateKey: readEnv("KOL_HOLDER_REWARD_PRIVATE_KEY"),
  solanaRpcUrl: readEnv("SOLANA_RPC_URL"),
  heliusRpcUrl: readEnv("HELIUS_RPC_URL"),
  heliusApiKey: readEnv("HELIUS_API_KEY"),
  tokenFixedSupply: readNumber("TOKEN_FIXED_SUPPLY", 1_000_000_000),
  marketCapApiUrl: readEnv("MARKET_CAP_API_URL"),
  marketCapApiKey: readEnv("MARKET_CAP_API_KEY"),
  excludedHolderWallets: readEnv("EXCLUDED_HOLDER_WALLETS"),
};

export function assertSupabaseConfigured(): void {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw new Error("Worker requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
}
