import { config } from "../config.js";
import { round, sum } from "../math.js";
import type { Distribution, HolderSnapshot, Kol, PayoutPlan, PayoutRecipient, RaceIntervalRecord, TokenHolderBalance } from "../types.js";
import type { SupabaseRepository } from "../repositories/supabase-repository.js";
import { getTokenHolderBalances } from "./holders.js";
import { transferSolToRecipients } from "./solana-transfer.js";

function requireValue(value: string | null | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function excludedWallets(): Set<string> {
  const configured = [
    config.winnerKolRewardVault,
    config.kolHolderRewardVault,
    config.winningKolBonusWallet,
    config.buybackBurnWallet,
    config.finalsVaultWallet,
    ...(config.excludedHolderWallets?.split(",") ?? []),
  ];

  return new Set(configured.map((wallet) => wallet?.trim()).filter((wallet): wallet is string => Boolean(wallet)));
}

function buildWeightedRecipients(holders: TokenHolderBalance[], totalSol: number, excluded: Set<string>): PayoutRecipient[] {
  const eligible = holders.filter((holder) => holder.amount > 0 && !excluded.has(holder.owner));
  const firstPassTotal = sum(eligible.map((holder) => holder.amount));

  if (firstPassTotal <= 0 || totalSol <= 0) {
    return [];
  }

  const aboveMinimum = eligible.filter((holder) => (holder.amount / firstPassTotal) * totalSol >= config.minPayoutSol);
  const finalWeight = sum(aboveMinimum.map((holder) => holder.amount));

  if (finalWeight <= 0) {
    return [];
  }

  return aboveMinimum.map((holder) => ({
    wallet: holder.owner,
    tokenAmount: round(holder.amount, 6),
    amountSol: round((holder.amount / finalWeight) * totalSol, 9),
  }));
}

function makeHolderSnapshot(options: {
  race: RaceIntervalRecord;
  mint: string;
  kind: HolderSnapshot["kind"];
  holders: TokenHolderBalance[];
  capturedAt: Date;
}): HolderSnapshot {
  return {
    id: `${options.race.id}-${options.kind}-${options.capturedAt.getTime()}`,
    raceId: options.race.id,
    mint: options.mint,
    kind: options.kind,
    capturedAt: options.capturedAt.toISOString(),
    holderCount: options.holders.length,
    totalTokenAmount: round(sum(options.holders.map((holder) => holder.amount)), 6),
    holders: options.holders,
  };
}

export async function buildPayoutPlan(options: {
  repo: SupabaseRepository;
  race: RaceIntervalRecord;
  distribution: Distribution;
  winningKol: Kol;
  generatedAt?: Date;
}): Promise<PayoutPlan> {
  const winningKolMint = requireValue(options.winningKol.tokenMint, `${options.winningKol.name} token mint`);
  const kolMint = requireValue(config.kolMint, "KOL_MINT");
  const generatedAt = options.generatedAt ?? new Date();
  const excluded = excludedWallets();

  const [winnerHolders, kolHolders] = await Promise.all([
    getTokenHolderBalances(winningKolMint),
    getTokenHolderBalances(kolMint),
  ]);

  const winnerSnapshot = makeHolderSnapshot({
    race: options.race,
    mint: winningKolMint,
    kind: "winner_kol",
    holders: winnerHolders,
    capturedAt: generatedAt,
  });
  const kolSnapshot = makeHolderSnapshot({
    race: options.race,
    mint: kolMint,
    kind: "kol_airdrop",
    holders: kolHolders,
    capturedAt: generatedAt,
  });

  await Promise.all([
    options.repo.insertHolderSnapshot(winnerSnapshot),
    options.repo.insertHolderSnapshot(kolSnapshot),
  ]);

  const kolEligible = kolHolders.filter((holder) => holder.amount >= config.kolMinHolding);
  const winningKolBonusWallet = options.winningKol.feeWallet ?? config.winningKolBonusWallet;

  return {
    generatedAt: generatedAt.toISOString(),
    raceId: options.race.id,
    winningKolId: options.winningKol.id,
    winningKolMint,
    kolMint,
    minKolHolding: config.kolMinHolding,
    winnerHolderRecipients: buildWeightedRecipients(winnerHolders, options.distribution.winnerHoldersAmountSol, excluded),
    kolHolderRecipients: buildWeightedRecipients(kolEligible, options.distribution.kolAirdropAmountSol, excluded),
    winningKolBonusTransfer: winningKolBonusWallet
      ? {
          wallet: winningKolBonusWallet,
          tokenAmount: 0,
          amountSol: options.distribution.winningKolBonusAmountSol,
        }
      : null,
    buybackBurnTransfer: config.buybackBurnWallet
      ? {
          wallet: config.buybackBurnWallet,
          tokenAmount: 0,
          amountSol: options.distribution.buybackBurnAmountSol,
        }
      : null,
    finalsVaultTransfer: config.finalsVaultWallet
      ? {
          wallet: config.finalsVaultWallet,
          tokenAmount: 0,
          amountSol: options.distribution.finalsVaultAmountSol,
        }
      : null,
    excludedWallets: [...excluded],
    holderSnapshotIds: [winnerSnapshot.id, kolSnapshot.id],
  };
}

function assertPlanExecutable(plan: PayoutPlan): void {
  if (plan.winnerHolderRecipients.length === 0) {
    throw new Error("No eligible winner KOL recipients after filters.");
  }

  if (plan.kolHolderRecipients.length === 0) {
    throw new Error("No eligible $KOL recipients after filters.");
  }

  if (!plan.winningKolBonusTransfer) {
    throw new Error("winning KOL fee_wallet or WINNING_KOL_BONUS_WALLET is required.");
  }

  if (!plan.buybackBurnTransfer) {
    throw new Error("BUYBACK_BURN_WALLET is required.");
  }

  if (!plan.finalsVaultTransfer) {
    throw new Error("FINALS_VAULT_WALLET is required.");
  }
}

async function getOrAttachPayoutPlan(
  repo: SupabaseRepository,
  race: RaceIntervalRecord,
  distribution: Distribution,
): Promise<PayoutPlan> {
  if (distribution.payoutPlan) {
    return distribution.payoutPlan;
  }

  const winningKol = await repo.getKol(distribution.winningKolId);
  if (!winningKol) {
    throw new Error("Winning KOL not found.");
  }

  const plan = await buildPayoutPlan({
    repo,
    race,
    distribution,
    winningKol,
    generatedAt: race.snapshotEnd?.[winningKol.id]?.recordedAt
      ? new Date(race.snapshotEnd[winningKol.id].recordedAt)
      : new Date(),
  });

  await repo.upsertDistribution({ ...distribution, payoutPlan: plan });
  return plan;
}

async function transferBucketSplit(plan: PayoutPlan, distribution: Distribution): Promise<string[]> {
  if (!plan.buybackBurnTransfer) {
    throw new Error("BUYBACK_BURN_WALLET is required.");
  }

  if (!plan.finalsVaultTransfer) {
    throw new Error("FINALS_VAULT_WALLET is required.");
  }

  if (!plan.winningKolBonusTransfer) {
    throw new Error("winning KOL fee_wallet or WINNING_KOL_BONUS_WALLET is required.");
  }

  const recipients: PayoutRecipient[] = [
    {
      wallet: requireValue(config.winnerKolRewardVault, "WINNER_KOL_REWARD_VAULT"),
      tokenAmount: 0,
      amountSol: distribution.winnerHoldersAmountSol,
    },
    {
      wallet: requireValue(config.kolHolderRewardVault, "KOL_HOLDER_REWARD_VAULT"),
      tokenAmount: 0,
      amountSol: distribution.kolAirdropAmountSol,
    },
    plan.winningKolBonusTransfer,
    plan.buybackBurnTransfer,
    plan.finalsVaultTransfer,
  ];

  const result = await transferSolToRecipients({
    privateKey: requireValue(config.claimWalletPrivateKey, "CLAIM_WALLET_PRIVATE_KEY or PAYOUT_SIGNER_PRIVATE_KEY"),
    recipients,
  });

  return result.signatures;
}

async function transferTreasuryBuckets(plan: PayoutPlan): Promise<string[]> {
  const transfers = [plan.winningKolBonusTransfer, plan.buybackBurnTransfer, plan.finalsVaultTransfer].filter(
    (transfer): transfer is PayoutRecipient => Boolean(transfer),
  );

  if (transfers.length === 0) {
    return [];
  }

  const result = await transferSolToRecipients({
    privateKey: requireValue(config.treasuryPrivateKey, "TREASURY_PRIVATE_KEY"),
    recipients: transfers,
  });

  return result.signatures;
}

async function markDistributionFailed(
  repo: SupabaseRepository,
  distribution: Distribution,
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : "Payout execution failed";
  await repo.upsertDistribution({ ...distribution, txStatus: "failed", failedReason: message });
  await repo.appendLog("error", "Distribution payout failed", {
    distributionId: distribution.id,
    raceId: distribution.raceId,
    error: message,
  });
}

export async function attachPayoutPlanToDistribution(
  repo: SupabaseRepository,
  race: RaceIntervalRecord,
  distribution: Distribution,
): Promise<void> {
  try {
    await getOrAttachPayoutPlan(repo, race, distribution);
  } catch (error) {
    await repo.appendLog("warn", "Payout plan could not be generated", {
      distributionId: distribution.id,
      raceId: race.id,
      error: error instanceof Error ? error.message : "Unknown payout plan error",
    });
  }
}

export async function executeDistributionPayout(repo: SupabaseRepository, distribution: Distribution): Promise<void> {
  const race = await repo.getRace(distribution.raceId);
  if (!race) {
    throw new Error("Distribution race not found.");
  }

  const plan = await getOrAttachPayoutPlan(repo, race, distribution);
  assertPlanExecutable(plan);

  const signatures: string[] = [];

  if (config.payoutSplitFromClaimWallet) {
    signatures.push(...(await transferBucketSplit(plan, distribution)));
  } else {
    signatures.push(...(await transferTreasuryBuckets(plan)));
  }

  const winnerResult = await transferSolToRecipients({
    privateKey: requireValue(config.winnerKolRewardPrivateKey, "WINNER_KOL_REWARD_PRIVATE_KEY"),
    expectedPublicKey: requireValue(config.winnerKolRewardVault, "WINNER_KOL_REWARD_VAULT"),
    recipients: plan.winnerHolderRecipients,
  });
  signatures.push(...winnerResult.signatures);

  const kolHolderResult = await transferSolToRecipients({
    privateKey: requireValue(config.kolHolderRewardPrivateKey, "KOL_HOLDER_REWARD_PRIVATE_KEY"),
    expectedPublicKey: requireValue(config.kolHolderRewardVault, "KOL_HOLDER_REWARD_VAULT"),
    recipients: plan.kolHolderRecipients,
  });
  signatures.push(...kolHolderResult.signatures);

  const completedAt = new Date().toISOString();
  await repo.upsertDistribution({
    ...distribution,
    payoutPlan: plan,
    txStatus: "complete",
    completedAt,
    txSignatures: [...distribution.txSignatures, ...signatures],
    failedReason: null,
  });
  await repo.upsertRace({ ...race, distributionComplete: true });
  await repo.appendLog("info", "Distribution payout executed", {
    distributionId: distribution.id,
    raceId: distribution.raceId,
    winnerRecipients: plan.winnerHolderRecipients.length,
    kolRecipients: plan.kolHolderRecipients.length,
    signatures,
  });
}

export async function executeReadyDistributions(repo: SupabaseRepository): Promise<void> {
  if (!config.payoutExecutionEnabled) {
    return;
  }

  const ready = (await repo.getDistributions()).filter((distribution) => distribution.txStatus === "ready");

  for (const distribution of ready) {
    try {
      await executeDistributionPayout(repo, distribution);
    } catch (error) {
      await markDistributionFailed(repo, distribution, error);
    }
  }
}
