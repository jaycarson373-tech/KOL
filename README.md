# KOL King of Liquidity

A Miami race-night KOL tournament dashboard for `$KOL`.

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

The current UI uses a luxury Miami Grand Prix theme with Lambo-style KOL racers.

## Prize Split

- 50% to holders of the winning KOL from the race interval
- 20% airdropped to `$KOL` holders
- 15% buyback and burn
- 15% to the grand finals holder-winner pot
