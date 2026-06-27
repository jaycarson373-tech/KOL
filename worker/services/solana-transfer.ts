import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import bs58 from "bs58";

import { config } from "../config.js";
import type { PayoutRecipient } from "../types.js";

export interface TransferBatchResult {
  signatures: string[];
  transferredSol: number;
}

function getRpcUrl(): string {
  const url = config.solanaRpcUrl ?? config.heliusRpcUrl;
  if (!url) {
    throw new Error("SOL transfers require SOLANA_RPC_URL or HELIUS_RPC_URL.");
  }

  return url;
}

export function keypairFromPrivateKey(privateKey: string): Keypair {
  const trimmed = privateKey.trim();

  if (trimmed.startsWith("[")) {
    const bytes = JSON.parse(trimmed) as number[];
    return Keypair.fromSecretKey(Uint8Array.from(bytes));
  }

  return Keypair.fromSecretKey(bs58.decode(trimmed));
}

function assertExpectedPublicKey(keypair: Keypair, expectedPublicKey?: string): void {
  if (!expectedPublicKey) {
    return;
  }

  const actual = keypair.publicKey.toBase58();
  if (actual !== expectedPublicKey) {
    throw new Error(`Private key public address ${actual} does not match configured vault ${expectedPublicKey}`);
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }

  return batches;
}

function recipientLamports(recipient: PayoutRecipient): number {
  return Math.floor(recipient.amountSol * LAMPORTS_PER_SOL);
}

export async function transferSolToRecipients(options: {
  privateKey: string;
  expectedPublicKey?: string;
  recipients: PayoutRecipient[];
}): Promise<TransferBatchResult> {
  const keypair = keypairFromPrivateKey(options.privateKey);
  assertExpectedPublicKey(keypair, options.expectedPublicKey);

  const recipients = options.recipients.filter((recipient) => recipientLamports(recipient) > 0);
  if (recipients.length === 0) {
    return { signatures: [], transferredSol: 0 };
  }

  const connection = new Connection(getRpcUrl(), "confirmed");
  const batchSize = Math.max(1, Math.min(12, config.payoutBatchSize));
  const signatures: string[] = [];
  let transferredLamports = 0;

  for (const batch of chunk(recipients, batchSize)) {
    const transaction = new Transaction();

    for (const recipient of batch) {
      const lamports = recipientLamports(recipient);
      transferredLamports += lamports;
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: new PublicKey(recipient.wallet),
          lamports,
        }),
      );
    }

    const signature = await sendAndConfirmTransaction(connection, transaction, [keypair], {
      commitment: "confirmed",
      skipPreflight: false,
    });
    signatures.push(signature);
  }

  return {
    signatures,
    transferredSol: transferredLamports / LAMPORTS_PER_SOL,
  };
}
