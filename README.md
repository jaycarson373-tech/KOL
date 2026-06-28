# KOL King of Liquidity

A polished KOL tournament dashboard for `$KOL`.

## Run locally

```bash
npm install
npm run dev
```

## Configure live data

Copy `.env.example` to `.env` and fill in:

```bash
VITE_HELIUS_API_KEY=your_key
VITE_ENABLE_LIVE_MARKET_CAPS=true
VITE_KOL_TOKEN_CA=your_kol_token_ca
```

KOL profiles live in `src/data/kols.ts`. Replace the placeholder names, X URLs,
profile images, token contract addresses, trade links, wins, losses, and starting
market caps there.

Market-cap ranking uses local placeholder caps by default. When
`VITE_ENABLE_LIVE_MARKET_CAPS=true`, the app checks Dexscreener by token CA for
market cap while keeping Helius wired for Solana token metadata lookups.

The current UI uses a professional race-dashboard theme with Lambo-style KOL racers.

## Railway Worker

Run `supabase/schema.sql` in Supabase, then seed the current placeholder KOLs
and races with:

```bash
npm run seed:worker
```

Railway should run `npm run worker` with the variables from `.env.example`.
Use `WORKER_MODE=daemon` for polling or `WORKER_MODE=cron` for one tick per
Railway cron run. Payout execution is disabled by default; set
`PAYOUT_EXECUTION_ENABLED=true` only after reward wallets are funded and private
keys are configured on Railway.

The worker snapshots race market caps, determines winners, snapshots holder
balances with Helius, waits through the manual review window, builds payout
plans, and can execute the `$KOL` split: 50% winner KOL holders, 20% `$KOL`
holders, 10% winning KOL wallet, 10% buyback/burn wallet, and 10% championship
vault.

Set `KOL_MIN_HOLDING=250000` so only wallets holding at least 250K `$KOL`
qualify for holder airdrops. This gate applies to both the 50% winning-token
holder payout and the 20% `$KOL` holder payout.

The default payout delay is five minutes after race end
(`DISTRIBUTION_READY_DELAY_MS=300000`). Race-end snapshots are captured first,
then the payout plan is generated after the delay from the current
`race_intervals.winner_kol_id`, so an incorrect winner can be manually corrected
in Supabase before funds move.

## Prize Split

- 50% to holders of the winning KOL from the race interval
- 20% airdropped to `$KOL` holders
- 10% to the winning KOL wallet
- 10% buyback and burn
- 10% to the championship holder wallet
