/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BUY_KOL_URL?: string;
  readonly VITE_CA_URL?: string;
  readonly VITE_DEXSCREENER_URL?: string;
  readonly VITE_ENABLE_LIVE_MARKET_CAPS?: string;
  readonly VITE_HELIUS_API_KEY?: string;
  readonly VITE_KOL_MINT?: string;
  readonly VITE_KOL_TOKEN_CA?: string;
  readonly VITE_PUMPFUN_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_TELEGRAM_URL?: string;
  readonly VITE_X_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
