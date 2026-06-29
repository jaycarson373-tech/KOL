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
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_BUY_KOL_URL=your_primary_buy_link
VITE_PUMPFUN_URL=your_pump_fun_link
VITE_X_URL=your_official_x_link
VITE_DEXSCREENER_URL=your_dexscreener_link
VITE_TELEGRAM_URL=your_telegram_link
VITE_CA_URL=your_contract_address_link
```

KOL profiles live in `src/data/kols.ts`. The Season 1 roster is ordered there,
with profile images stored under `public/kols` and referenced as stable
`/kols/...jpg` paths. Add token contract addresses, trade links, wins, losses,
and starting market caps there as they become available.

Market-cap ranking uses local placeholder caps by default. When
`VITE_ENABLE_LIVE_MARKET_CAPS=true`, the app checks Dexscreener by token CA for
market cap while keeping Helius wired for Solana token metadata lookups.

The current UI uses a professional race-dashboard theme with KOL race cars.
When `VITE_KOL_TOKEN_CA` is empty, the header shows `CA Soon`. Once the mint is
set, the header and footer link to `VITE_CA_URL` or Solscan by default.

## Railway Worker

Run `supabase/schema.sql` in Supabase, then seed the current KOL roster and
public Round 1 race schedule with:

```bash
npm run seed:worker
```

Set `SEASON_ONE_START_AT` before running the seed if the first race should
start at a different time. The fallback schedule uses 8-hour Round 1 races with
a 1-hour intermission between each race.

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

## Test Race

Use two to four real Solana token mints with DexScreener/Helius data:

```bash
TEST_RACE_DURATION_MINUTES=10 npm run launch:test-race -- CA_1 CA_2
npm run worker:tick
```

The test launcher creates `test-kol-01` through however many CAs you pass,
schedules a race starting immediately, and pauses other open races by default
so the app shows the test matchup. Set `TEST_PAUSE_OTHER_RACES=false` to leave
existing races untouched. First test should stay at 10 minutes with two CAs and
`PAYOUT_EXECUTION_ENABLED=false`.

Useful overrides:

```bash
TEST_RACE_START_DELAY_MINUTES=2
TEST_RACE_DURATION_MINUTES=10
TEST_KOL_NAMES="KOL One,KOL Two"
TEST_KOL_SYMBOLS="$ONE,$TWO"
TEST_KOL_FEES_SOL=0
TEST_ENTRANT_FEES_SOL=0
```

Keep `PAYOUT_EXECUTION_ENABLED=false` for the test unless all payout wallets,
private keys, fee claiming, and buyback/burn execution are intentionally ready.

## Prize Split

- 50% to holders of the winning KOL from the race interval
- 20% airdropped to `$KOL` holders
- 10% to the winning KOL wallet
- 10% buyback and burn
- 10% to the championship holder wallet
