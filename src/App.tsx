import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Crown,
  Flame,
  HelpCircle,
  Medal,
  Menu,
  Play,
  Radio,
  Route,
  Shield,
  Trophy,
  Users,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import {
  activeRace,
  kols,
  upcomingRaces as fallbackUpcomingRaces,
} from "./data/kols";
import kolLogo from "./assets/logo/kol-logo.jpg";
import { LoadingScreen } from "./components/LoadingScreen";
import { fetchCurrentRaceFeed, type RaceFeed } from "./services/raceFeed";
import type { KolProfile, PayoutTransaction, RaceEntrant, RaceInterval } from "./types";
import {
  buildEntrants,
  formatCompactUsd,
  formatPercentChange,
  formatSol,
  getCountdownParts,
  getInitials,
  getRacePot,
  getSplitAmounts,
  prizeSplit,
} from "./utils/race";

type CameraMode = "top" | "cinema";

interface LeagueKol extends KolProfile {
  leagueRank: number;
  averageGain: number;
  upcomingRace: string;
  isPlaceholder?: boolean;
}

function publicEnv(key: string): string {
  const env = import.meta.env as unknown as Record<string, string | undefined>;
  return env[key]?.trim() ?? "";
}

function isExternalHref(href: string): boolean {
  return href.startsWith("http://") || href.startsWith("https://");
}

function shortAddress(address: string): string {
  return address.length > 10 ? `${address.slice(0, 4)}...${address.slice(-4)}` : address;
}

const kolContractAddress = publicEnv("VITE_KOL_TOKEN_CA") || publicEnv("VITE_KOL_MINT");
const officialLinks = {
  ca:
    publicEnv("VITE_CA_URL") ||
    (kolContractAddress ? `https://solscan.io/token/${kolContractAddress}` : "#"),
  dex:
    publicEnv("VITE_DEXSCREENER_URL") ||
    (kolContractAddress ? `https://dexscreener.com/solana/${kolContractAddress}` : "#"),
  pump:
    publicEnv("VITE_PUMPFUN_URL") ||
    (kolContractAddress ? `https://pump.fun/coin/${kolContractAddress}` : "#"),
  telegram: publicEnv("VITE_TELEGRAM_URL") || "#",
  x: publicEnv("VITE_X_URL") || "https://x.com",
};

const buyKolUrl = publicEnv("VITE_BUY_KOL_URL") || officialLinks.pump;

const resources = [
  ["Live Race", "/#track", Radio],
  ["Dashboard", "/dashboard", WalletCards],
  ["Standings", "/standings", Trophy],
  ["Bracket", "/bracket", Route],
  ["Schedule", "/schedule", CalendarDays],
  ["Current KOLs", "/kols", Users],
  ["How It Works", "/how-it-works", HelpCircle],
  ["Pump.fun", officialLinks.pump, Flame],
  ["Buy $KOL", buyKolUrl, CircleDollarSign],
  ["X", officialLinks.x, ArrowUpRight],
  ["CA", officialLinks.ca, Shield],
  ["DexScreener", officialLinks.dex, BarChart3],
  ["Telegram", officialLinks.telegram, Zap],
  ["FAQ", "/faq", HelpCircle],
] as const;

const fallbackRaceFeed: RaceFeed = {
  race: {
    ...activeRace,
  },
  kols,
  upcomingRaces: fallbackUpcomingRaces,
  payoutTransactions: [],
  isLiveRaceActive: activeRace.status === "live",
  isConfigured: false,
};

const faqs = [
  [
    "What is King of Liquidity?",
    "Season 1 is a 32-KOL tournament where market cap performance decides who advances toward the crown.",
  ],
  [
    "How does a race work?",
    "Four KOLs enter The Track, race for a fixed window, and the highest ending market cap performance wins.",
  ],
  [
    "How are rewards split?",
    "Race fees split 30% to winning coin holders, 40% to $KOL holders, 10% to the winning KOL, 10% to burn, and 10% to the championship vault.",
  ],
  [
    "How do I qualify?",
    "Hold 250K+ $KOL for holder rewards. Hold the winning coin to share in that race's winner-holder pool.",
  ],
  [
    "How do tournaments work?",
    "Season 1 starts with eight public 4-KOL Round 1 races at 8 hours each, with a 1-hour intermission between races. Round 2 has two 4-KOL battles at 10 hours each. The Grand Final is a 20-hour 1v1.",
  ],
  [
    "When are payouts?",
    "Payout plans are generated after race snapshots, then executed by the Railway worker once payout execution is enabled.",
  ],
  [
    "How does Season 2 work?",
    "After the King is crowned, Season 2 begins with a fresh field and a new path to the title.",
  ],
] as const;

const siteNavItems = [
  ["track", "The Track", "#track"],
  ["dashboard", "Dashboard", "/dashboard"],
  ["standings", "Standings", "/standings"],
  ["bracket", "Bracket", "/bracket"],
  ["schedule", "Schedule", "/schedule"],
  ["kols", "KOLs", "/kols"],
  ["how", "How It Works", "/how-it-works"],
  ["faq", "FAQ", "/faq"],
] as const;

type SiteNavItem = (typeof siteNavItems)[number][0];

function App() {
  const [camera, setCamera] = useState<CameraMode>("top");
  const [raceFeed, setRaceFeed] = useState<RaceFeed>(fallbackRaceFeed);
  const [isIntroLoading, setIsIntroLoading] = useState(true);
  const [isLoadingWindowOpen, setIsLoadingWindowOpen] = useState(true);
  const [isRaceFeedFetching, setIsRaceFeedFetching] = useState(true);
  const [hasCompletedInitialRaceFetch, setHasCompletedInitialRaceFetch] = useState(false);
  const currentRace = raceFeed.race ?? fallbackRaceFeed.race!;
  const raceProfiles = raceFeed.kols.length > 0 ? raceFeed.kols : fallbackRaceFeed.kols;
  const currentUpcomingRaces =
    raceFeed.upcomingRaces.length > 0 ? raceFeed.upcomingRaces : fallbackRaceFeed.upcomingRaces;
  const payoutTransactions = raceFeed.payoutTransactions;
  const isLiveRaceActive = raceFeed.isLiveRaceActive && currentRace.status === "live";
  const countdownEndsAt = useMemo(
    () => getCountdownTarget(currentRace, isLiveRaceActive),
    [currentRace.endsAt, currentRace.id, currentRace.startsAt, isLiveRaceActive],
  );
  const [countdown, setCountdown] = useState(() =>
    getCountdownParts(countdownEndsAt),
  );

  useEffect(() => {
    setCountdown(getCountdownParts(countdownEndsAt));
    const interval = window.setInterval(() => {
      setCountdown(getCountdownParts(countdownEndsAt));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [countdownEndsAt]);

  useEffect(() => {
    const introTimeout = window.setTimeout(() => setIsIntroLoading(false), 1_800);
    const maxLoadingTimeout = window.setTimeout(() => setIsLoadingWindowOpen(false), 2_400);

    return () => {
      window.clearTimeout(introTimeout);
      window.clearTimeout(maxLoadingTimeout);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    let interval: number | undefined;
    let completedInitialFetch = false;

    const loadRaceFeed = () => {
      if (isMounted) {
        setIsRaceFeedFetching(true);
      }

      fetchCurrentRaceFeed()
        .then((feed) => {
          if (isMounted && feed?.race) {
            setRaceFeed(feed);
          }
        })
        .catch(() => {
          if (isMounted) {
            setRaceFeed(fallbackRaceFeed);
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsRaceFeedFetching(false);

            if (!completedInitialFetch) {
              completedInitialFetch = true;
              setHasCompletedInitialRaceFetch(true);
            }
          }
        });
    };

    loadRaceFeed();
    interval = window.setInterval(loadRaceFeed, 30_000);

    return () => {
      isMounted = false;
      if (interval) {
        window.clearInterval(interval);
      }
    };
  }, []);

  const entrants = useMemo(
    () => buildEntrants(currentRace, raceProfiles, isLiveRaceActive),
    [currentRace, isLiveRaceActive, raceProfiles],
  );
  const splitAmounts = getSplitAmounts(currentRace);
  const field = useMemo(
    () => buildLeagueField(raceProfiles, currentRace, entrants),
    [currentRace, entrants, raceProfiles],
  );
  const standings = field.slice().sort((a, b) => {
    const winDiff = b.wins - a.wins;
    if (winDiff !== 0) {
      return winDiff;
    }

    return b.averageGain - a.averageGain;
  });
  const currentPath = window.location.pathname;
  const shouldShowLoadingScreen =
    isIntroLoading ||
    (isLoadingWindowOpen && isRaceFeedFetching && !hasCompletedInitialRaceFetch);

  if (currentPath === "/live" || currentPath === "/race" || currentPath === "/track") {
    return (
      <>
        <LiveRacePage
          camera={camera}
          countdown={countdown}
          entrants={entrants}
          field={field}
          isLiveRaceActive={isLiveRaceActive}
          race={currentRace}
          setCamera={setCamera}
          splitAmounts={splitAmounts}
        />
        <LoadingScreen active={shouldShowLoadingScreen} />
      </>
    );
  }

  if (currentPath === "/standings") {
    return (
      <RoutedPage activeItem="standings" pageClassName="page-shell--standings" loading={shouldShowLoadingScreen}>
        <Standings standings={standings} />
      </RoutedPage>
    );
  }

  if (currentPath === "/dashboard" || currentPath === "/rewards" || currentPath === "/payouts") {
    return (
      <RoutedPage activeItem="dashboard" pageClassName="page-shell--dashboard" loading={shouldShowLoadingScreen}>
        <RewardDashboard
          entrants={entrants}
          isLiveRaceActive={isLiveRaceActive}
          payoutTransactions={payoutTransactions}
          race={currentRace}
          splitAmounts={splitAmounts}
        />
      </RoutedPage>
    );
  }

  if (currentPath === "/bracket") {
    return (
      <RoutedPage activeItem="bracket" pageClassName="page-shell--bracket" loading={shouldShowLoadingScreen}>
        <TournamentBracket />
      </RoutedPage>
    );
  }

  if (currentPath === "/schedule") {
    return (
      <RoutedPage activeItem="schedule" pageClassName="page-shell--schedule" loading={shouldShowLoadingScreen}>
        <RaceSchedule currentRace={currentRace} upcomingRaces={currentUpcomingRaces} />
      </RoutedPage>
    );
  }

  if (currentPath === "/kols") {
    return (
      <RoutedPage activeItem="kols" pageClassName="page-shell--kols" loading={shouldShowLoadingScreen}>
        <KolGrid field={field} />
      </RoutedPage>
    );
  }

  if (currentPath === "/how-it-works") {
    return (
      <RoutedPage activeItem="how" pageClassName="page-shell--how" loading={shouldShowLoadingScreen}>
        <HowItWorks />
      </RoutedPage>
    );
  }

  if (currentPath === "/faq") {
    return (
      <RoutedPage activeItem="faq" pageClassName="page-shell--faq" loading={shouldShowLoadingScreen}>
        <Faq />
      </RoutedPage>
    );
  }

  return (
    <>
      <main className="site-shell home-shell">
        <SiteHeader activeItem="track" />
        <HeroSection
          countdown={countdown}
          entrants={entrants}
          isLiveRaceActive={isLiveRaceActive}
          race={currentRace}
          splitAmounts={splitAmounts}
        />
        <TrackSection
          countdown={countdown}
          entrants={entrants}
          isLiveRaceActive={isLiveRaceActive}
          race={currentRace}
          splitAmounts={splitAmounts}
          variant="standard"
        />
        <RaceSchedule currentRace={currentRace} upcomingRaces={currentUpcomingRaces} />
        <SiteFooter />
        <KolOsNav />
      </main>
      <LoadingScreen active={shouldShowLoadingScreen} />
    </>
  );
}

function RoutedPage({
  activeItem,
  children,
  loading,
  pageClassName,
}: {
  activeItem?: SiteNavItem;
  children: ReactNode;
  loading: boolean;
  pageClassName: string;
}) {
  return (
    <>
      <main className={`site-shell page-shell ${pageClassName}`}>
        <SiteHeader activeItem={activeItem} />
        {children}
        <SiteFooter />
      </main>
      <LoadingScreen active={loading} />
    </>
  );
}

function SiteHeader({ activeItem }: { activeItem?: SiteNavItem }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isHomePath = window.location.pathname === "/";

  return (
    <header className="site-header">
      <a className="brand-lockup" href="/" aria-label="King of Liquidity home">
        <img className="brand-logo" src={kolLogo} alt="" aria-hidden="true" />
        <strong>King of Liquidity</strong>
      </a>
      <button
        className="nav-menu-toggle"
        type="button"
        aria-controls="primary-nav"
        aria-expanded={isMenuOpen}
        aria-label={isMenuOpen ? "Close navigation" : "Open navigation"}
        onClick={() => setIsMenuOpen((open) => !open)}
      >
        {isMenuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
      </button>
      <nav className={`site-nav ${isMenuOpen ? "is-open" : ""}`} id="primary-nav" aria-label="Primary navigation">
        {siteNavItems.map(([id, label, href]) => {
          const resolvedHref = href.startsWith("#") && !isHomePath ? `/${href}` : href;
          const isExternal = isExternalHref(resolvedHref);

          return (
            <a
              aria-current={activeItem === id ? "page" : undefined}
              href={resolvedHref}
              key={id}
              rel={isExternal ? "noreferrer" : undefined}
              target={isExternal ? "_blank" : undefined}
              onClick={() => setIsMenuOpen(false)}
            >
              {label}
            </a>
          );
        })}
      </nav>
      <a className="nav-live" href={isHomePath ? "#track" : "/#track"} aria-current={activeItem === "track" ? "page" : undefined}>
        <Radio size={16} aria-hidden="true" />
        The Track
      </a>
      <ContractChip />
    </header>
  );
}

function ContractChip() {
  if (!kolContractAddress) {
    return (
      <span className="contract-chip is-pending" aria-label="KOL contract address coming soon">
        <span>CA</span>
        <strong>Soon</strong>
      </span>
    );
  }

  return (
    <a className="contract-chip" href={officialLinks.ca} target="_blank" rel="noreferrer" aria-label="Open KOL contract address">
      <span>CA</span>
      <strong>{shortAddress(kolContractAddress)}</strong>
    </a>
  );
}

function HeroSection({
  countdown,
  entrants,
  isLiveRaceActive,
  race,
  splitAmounts,
}: {
  countdown: ReturnType<typeof getCountdownParts>;
  entrants: RaceEntrant[];
  isLiveRaceActive: boolean;
  race: RaceInterval;
  splitAmounts: ReturnType<typeof getSplitAmounts>;
}) {
  const leader = entrants.find((entrant) => entrant.isLeader);
  const racePot = getRacePot(race);
  const heroRacers = entrants.slice(0, 4);

  return (
    <section className="hero-section" aria-labelledby="hero-title">
      <div className="hero-content">
        <p className="eyebrow">Season 1 · Live Tournament</p>
        <h1 className="pump-title" id="hero-title">KING OF LIQUIDITY</h1>
        <p className="hero-kicker">32 KOLs. One Tournament. One Crown.</p>
        <p className="hero-copy">
          Four KOLs enter The Track. Market cap performance decides who
          advances. Every race pays holders. One King of Liquidity remains.
        </p>
        <div className="hero-actions">
          <a className="primary-cta" href="#track">
            <Play size={18} aria-hidden="true" />
            View The Track
          </a>
          <a className="secondary-cta" href="#how-it-works">
            How It Works
            <ArrowRight size={18} aria-hidden="true" />
          </a>
        </div>
      </div>

      <aside className="hero-broadcast" aria-label="Current tournament snapshot">
        <div className="broadcast-status">
          <span className="status-light" />
          {isLiveRaceActive ? "Track feed live" : "Next race begins soon"}
        </div>
        <div className="hero-race-card">
          <span>{race.label}</span>
          <strong>{entrants.length > 0 ? entrants.map((entrant) => entrant.symbol).join("  ·  ") : "Awaiting racers"}</strong>
          {heroRacers.length > 0 ? (
            <div className="hero-racer-grid" aria-label="Current racers">
              {heroRacers.map((entrant) => (
                <div className="hero-racer-tile" key={entrant.id} style={{ "--tile-color": entrant.color } as CSSProperties}>
                  <Avatar entrant={entrant} />
                  <div>
                    <strong>{entrant.name}</strong>
                    <span>{entrant.symbol}</span>
                  </div>
                  <em>#{entrant.rank}</em>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="hero-intel-grid">
          <MiniPot label="Current leader" value={isLiveRaceActive && leader ? leader.symbol : "Parked"} />
          <MiniPot label="Race pot" value={formatSol(racePot)} />
          <MiniPot label="Winner holders" value={formatSol(splitAmounts.winnerHolders)} />
          <MiniPot label="Burn + vault" value={formatSol(splitAmounts.buybackBurn + splitAmounts.finalsVault)} />
        </div>
        <Countdown countdown={countdown} label={isLiveRaceActive ? "Next snapshot" : "Race opens"} />
      </aside>
    </section>
  );
}

function TrackSection({
  entrants,
  countdown,
  isLiveRaceActive,
  race,
  splitAmounts,
  variant = "standard",
}: {
  entrants: RaceEntrant[];
  countdown: ReturnType<typeof getCountdownParts>;
  isLiveRaceActive: boolean;
  race: RaceInterval;
  splitAmounts?: ReturnType<typeof getSplitAmounts>;
  variant?: "standard" | "hero";
}) {
  return (
    <section className={`track-section track-section--${variant}`} id="track" aria-labelledby="track-title">
      <div className="track-header">
        <div>
          <p className="eyebrow">Season 1 · {race.label}</p>
          <h2 id="track-title">{isLiveRaceActive ? "Live tournament race" : "Next race begins soon"}</h2>
          <p className="track-subtitle">
            32 KOLs enter Season 1. Round 1 races run 8 hours with a 1-hour intermission. Round 2 runs 10 hours. The Grand Final is a 20-hour 1v1.
          </p>
        </div>
        <div className="track-header-actions">
          <Countdown countdown={countdown} label={isLiveRaceActive ? "Race closes" : "Race opens"} />
          <a className="primary-cta" href="/track">
            <Radio size={18} aria-hidden="true" />
            Fullscreen
          </a>
        </div>
      </div>
      <RaceTrack entrants={entrants} camera="top" isLiveRaceActive={isLiveRaceActive} />
      <SeasonFormatStrip />
      <KingOfHillBanner entrants={entrants} isLiveRaceActive={isLiveRaceActive} race={race} />
      {splitAmounts ? (
        <LiveRaceTelemetry
          entrants={entrants}
          isLiveRaceActive={isLiveRaceActive}
          race={race}
          splitAmounts={splitAmounts}
        />
      ) : null}
      {race.status === "final" ? <RaceResult entrants={entrants} race={race} /> : null}
    </section>
  );
}

function SeasonFormatStrip() {
  const format = [
    ["Season 1", "32 KOLs", "One tournament. One crown."],
    ["Round 1", "8 hours", "8 races · 4 KOLs per race"],
    ["Round 2", "10 hours", "8 winners · 2 battles of 4"],
    ["Finals", "20 hours", "1v1 for King of Liquidity"],
  ] as const;

  return (
    <div className="season-format-strip" aria-label="Season 1 tournament format">
      {format.map(([label, value, detail]) => (
        <article className="season-format-card" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
          <em>{detail}</em>
        </article>
      ))}
    </div>
  );
}

function LiveRaceTelemetry({
  entrants,
  isLiveRaceActive,
  race,
  splitAmounts,
}: {
  entrants: RaceEntrant[];
  isLiveRaceActive: boolean;
  race: RaceInterval;
  splitAmounts: ReturnType<typeof getSplitAmounts>;
}) {
  const leader = entrants.find((entrant) => entrant.isLeader) ?? entrants[0];
  const racePot = getRacePot(race);
  const stats = [
    ["Race Pot", formatSol(racePot)],
    ["Winner Holders", formatSol(splitAmounts.winnerHolders)],
    ["$KOL Holders", formatSol(splitAmounts.kolAirdrop)],
    ["Championship Vault", formatSol(splitAmounts.finalsVault)],
    ["Buyback", formatSol(splitAmounts.buybackBurn)],
  ] as const;

  return (
    <div className="live-race-telemetry" aria-label="Live race status">
      <div className="telemetry-racers">
        <span className="card-label">
          {entrants.length > 0 ? `Current ${entrants.length} racers` : "Current racers"}
        </span>
        <div>
          {entrants.map((entrant) => (
            <span className={`telemetry-racer ${entrant.isLeader ? "is-leader" : ""}`} key={entrant.id}>
              <Avatar entrant={entrant} />
              <strong>{entrant.symbol}</strong>
              <em>{formatPercentChange(entrant.percentChange)}</em>
            </span>
          ))}
        </div>
      </div>
      <div className="telemetry-stats">
        {stats.map(([label, value]) => (
          <div className="telemetry-stat" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="telemetry-leader">
        <span>{isLiveRaceActive ? "Current leader" : "Race status"}</span>
        <strong>{isLiveRaceActive && leader ? leader.name : "Cars parked"}</strong>
      </div>
    </div>
  );
}

function CurrentRaceSummary({
  entrants,
  isLiveRaceActive,
  race,
  splitAmounts,
}: {
  entrants: RaceEntrant[];
  isLiveRaceActive: boolean;
  race: RaceInterval;
  splitAmounts: ReturnType<typeof getSplitAmounts>;
}) {
  const winner = entrants.find((entrant) => entrant.isLeader);
  const totalMarketCap = entrants.reduce((total, entrant) => total + entrant.marketCapUsd, 0);
  const racePot = getRacePot(race);

  return (
    <div className="race-summary-grid" aria-label="Homepage race overview">
      <div className="dashboard-card standings-card">
        <span className="card-label">{isLiveRaceActive && winner ? "Current Leader" : "Track Status"}</span>
        {winner ? (
          <>
            <div className="leader-feature">
              <Avatar entrant={winner} />
              <div>
                <strong>{isLiveRaceActive ? winner.name : "Next race begins soon"}</strong>
                <span>
                  {isLiveRaceActive
                    ? `${winner.symbol} · ${formatPercentChange(winner.percentChange)}`
                    : "Cars parked at the start line"}
                </span>
              </div>
            </div>
            <div className="leader-number">
              {isLiveRaceActive ? formatCompactUsd(winner.marketCapUsd) : "Parked"}
            </div>
          </>
        ) : (
          <div className="summary-metric">
            <span>Status</span>
            <strong>{isLiveRaceActive ? "No leader yet" : "Next race begins soon"}</strong>
          </div>
        )}
      </div>

      <div className="dashboard-card stat-stack-card">
        <span className="card-label">Race Summary</span>
        <SummaryMetric label="Total Market Cap" value={formatCompactUsd(totalMarketCap)} />
        <SummaryMetric label="Race Pot" value={formatSol(racePot)} />
        <SummaryMetric label="Reward Split" value="50 / 20 / 10 / 10 / 10" />
      </div>

      <div className="dashboard-card matchup-card">
        <span className="card-label">Current Racers</span>
        <div className="matchup-list">
          {entrants.map((entrant) => (
            <div className="matchup-row" key={entrant.id}>
              <span className="match-rank">#{entrant.rank}</span>
              <Avatar entrant={entrant} />
              <div>
                <strong>{entrant.name}</strong>
                <span>{formatCompactUsd(entrant.marketCapUsd)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-card stat-stack-card">
        <span className="card-label">Top Pools</span>
        <SummaryMetric label="Winning Coin Holders" value={formatSol(splitAmounts.winnerHolders)} />
        <SummaryMetric label="$KOL Holders" value={formatSol(splitAmounts.kolAirdrop)} />
        <SummaryMetric label="Championship Vault" value={formatSol(splitAmounts.finalsVault)} />
      </div>
    </div>
  );
}

function RewardDashboard({
  entrants,
  isLiveRaceActive,
  payoutTransactions,
  race,
  splitAmounts,
}: {
  entrants: RaceEntrant[];
  isLiveRaceActive: boolean;
  payoutTransactions: PayoutTransaction[];
  race: RaceInterval;
  splitAmounts: ReturnType<typeof getSplitAmounts>;
}) {
  return (
    <>
      <section className="content-section reward-pots-section dashboard-page-section" aria-labelledby="dashboard-title">
        <SectionHeading
          eyebrow="Reward Dashboard"
          title="Rewards, vaults, and payout status."
          copy="Live race pots, split buckets, current leader, and real payout transactions once the worker queues them."
        />
        <div className="dashboard-page-grid">
          <RewardPots splitAmounts={splitAmounts} />
          <CurrentRaceSummary
            entrants={entrants}
            isLiveRaceActive={isLiveRaceActive}
            race={race}
            splitAmounts={splitAmounts}
          />
        </div>
      </section>
      <PayoutTransactions payoutTransactions={payoutTransactions} />
    </>
  );
}

function PayoutTransactions({ payoutTransactions }: { payoutTransactions: PayoutTransaction[] }) {
  return (
    <section className="content-section payout-section" id="payouts" aria-labelledby="payouts-title">
      <SectionHeading
        eyebrow="Payout Transactions"
        title="Worker execution feed."
        copy="Real payout activity appears here after the worker creates a distribution."
      />
      <div className="payout-list">
        {payoutTransactions.length > 0 ? (
          payoutTransactions.map((payout) => {
            const total =
              payout.winnerHoldersAmountSol +
              payout.kolAirdropAmountSol +
              payout.winningKolBonusAmountSol +
              payout.buybackBurnAmountSol +
              payout.finalsVaultAmountSol;

            return (
              <article className={`payout-row payout-row--${payout.status}`} key={payout.id}>
                <div>
                  <span className="card-label">{payout.status}</span>
                  <strong>{payout.id}</strong>
                  <em>{payout.raceId}</em>
                </div>
                <div>
                  <span>Total</span>
                  <strong>{formatSol(total)}</strong>
                </div>
                <div>
                  <span>Ready</span>
                  <strong>{formatDateTime(payout.readyAt)}</strong>
                </div>
                <div>
                  <span>Txs</span>
                  <strong>{payout.txSignatures.length}</strong>
                </div>
                {payout.txSignatures.length > 0 ? (
                  <a href={`https://solscan.io/tx/${payout.txSignatures[0]}`} target="_blank" rel="noreferrer">
                    First Tx
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </a>
                ) : (
                  <span className="payout-muted">{payout.failedReason ?? "Waiting for execution"}</span>
                )}
              </article>
            );
          })
        ) : (
          <div className="dashboard-card payout-empty">
            <span className="card-label">No payouts yet</span>
            <strong>Transactions will appear after a race closes and the worker creates a distribution.</strong>
            <p>Keep payout execution off during the first test run, then enable execution once the flow is verified.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="summary-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RaceResult({ entrants, race }: { entrants: RaceEntrant[]; race: RaceInterval }) {
  const winner = entrants[0];
  if (!winner) {
    return null;
  }

  return (
    <div className="race-result">
      <span>King of the Hill</span>
      <strong>{winner.name}</strong>
      <em>{formatPercentChange(winner.percentChange)} · {formatSol(getRacePot(race) * prizeSplit.winnerHolders)} paid to winner holders</em>
    </div>
  );
}

function KingOfHillBanner({
  entrants,
  isLiveRaceActive,
  race,
}: {
  entrants: RaceEntrant[];
  isLiveRaceActive: boolean;
  race: RaceInterval;
}) {
  const king = entrants.find((entrant) => entrant.isLeader);
  const pole = king ?? entrants[0];
  const hasKing = Boolean(isLiveRaceActive && king);

  return (
    <div className={`king-hill-banner ${hasKing ? "is-active" : "is-idle"}`}>
      <div className="king-hill-mark" aria-hidden="true">
        <span>[</span>
        <Crown size={26} />
        <span>]</span>
      </div>
      <div className="king-hill-copy">
        <span className="king-hill-wordmark">king of the hill</span>
        <strong>{hasKing && king ? `${king.name} owns the hill right now` : "The hill is waiting for green"}</strong>
        <em>
          {hasKing && king
            ? `${king.symbol} leads ${race.label} by ${formatPercentChange(king.percentChange)} from the opening snapshot.`
            : "Once market caps move, the leading KOL gets the live crown."}
        </em>
      </div>
      {pole ? (
        <div className="king-hill-chip">
          <Avatar entrant={pole} />
          <div>
            <span>{hasKing ? "Current king" : "Pole position"}</span>
            <strong>{pole.symbol}</strong>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RewardPots({ splitAmounts }: { splitAmounts: ReturnType<typeof getSplitAmounts> }) {
  const pots = [
    ["30% Winning Coin Pot", splitAmounts.winnerHolders, Trophy],
    ["40% $KOL Holder Pot", splitAmounts.kolAirdrop, WalletCards],
    ["Winning KOL Championship Bonus", splitAmounts.winningKolBonus, Medal],
    ["Buyback + Burn", splitAmounts.buybackBurn, Flame],
    ["Championship Vault", splitAmounts.finalsVault, Crown],
  ] as const;

  return (
    <div className="dashboard-card reward-card">
      <span className="card-label">Current Prize Pots</span>
      <div className="pot-list">
        {pots.map(([label, value, Icon]) => (
          <div className="pot-row" key={label}>
            <Icon size={17} aria-hidden="true" />
            <span>{label}</span>
            <strong>{formatSol(value)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    ["Step 1", "Hold 250K+ $KOL"],
    ["Step 2", "4 KOLs enter each Season 1 race"],
    ["Step 3", "Highest ending market cap performance wins"],
    ["Step 4", "Creator fees split 30% / 40% / 10% / 10% / 10%"],
    ["Step 5", "Winner advances. Losers are eliminated."],
  ];

  return (
    <section className="content-section" id="how-it-works" aria-labelledby="how-title">
      <SectionHeading
        eyebrow="How It Works"
        title="Simple rules. Brutal bracket."
        copy="Every match is a market-cap race with visible pots and an immediate tournament consequence."
      />
      <div className="step-grid">
        {steps.map(([label, text]) => (
          <article className="step-card" key={label}>
            <span>{label}</span>
            <strong>{text}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

function TournamentBracket() {
  const rounds = [
    {
      label: "Round of 32",
      detail: "8 races · 4 KOLs each · 8 hours",
      matches: ["R32 Race 1", "R32 Race 2", "R32 Race 3", "R32 Race 4", "R32 Race 5", "R32 Race 6", "R32 Race 7", "R32 Race 8"],
    },
    {
      label: "Round 2 · Elite 8",
      detail: "2 battles · 4 winners each · 10 hours",
      matches: ["Round 2 Battle 1", "Round 2 Battle 2"],
    },
    {
      label: "Grand Final",
      detail: "1v1 · 20 hours",
      matches: ["Crown Match"],
    },
    {
      label: "King of Liquidity",
      detail: "Season 1 champion",
      matches: ["Crowned"],
    },
  ];

  return (
    <section className="content-section bracket-section" id="bracket" aria-labelledby="bracket-title">
      <SectionHeading
        eyebrow="Tournament Bracket"
        title="Season 1: 32 enter. One survives."
        copy="Round 1 has eight 8-hour races. Round 2 brings the eight winners into two 10-hour battles. The Grand Final is a 20-hour 1v1 for the crown."
      />
      <div className="league-format">
        <div className="format-stats">
          <MetricPill label="Season Field" value="32 KOLs" />
          <MetricPill label="Round 1" value="8h races" />
          <MetricPill label="Round 2" value="10h battles" />
          <MetricPill label="Grand Final" value="20h 1v1" />
        </div>
        <div className="bracket" aria-label="Season 1 tournament bracket">
          {rounds.map((round, index) => (
            <div className={`bracket-column bracket-column--${index + 1}`} key={round.label}>
              <div className="bracket-node">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{round.label}</strong>
                <em>{round.detail}</em>
              </div>
              <div className="bracket-match-list">
                {round.matches.map((match) => (
                  <div className="bracket-match" key={match}>
                    <Shield size={14} aria-hidden="true" />
                    <span>{match}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Standings({
  copy = "Top positions lead the field, contenders stay in the bracket, and eliminated KOLs fall out of Season 1.",
  eyebrow = "Standings",
  limit = 32,
  standings,
  title = "Who is still alive?",
}: {
  copy?: string;
  eyebrow?: string;
  limit?: number;
  standings: LeagueKol[];
  title?: string;
}) {
  return (
    <section className="content-section" id="standings" aria-labelledby="standings-title">
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        copy={copy}
      />
      <div className="standings-table" role="table" aria-label="Tournament standings">
        {standings.slice(0, limit).map((kol, index) => {
          const isEliminated = kol.losses > 0 || index >= 24;
          const state = isEliminated ? "Eliminated" : index < 8 ? "Top Seed" : "Contender";
          const trend = kol.averageGain > 0 ? "Up" : kol.averageGain < 0 ? "Down" : "Flat";

          return (
            <article
              className={`standing-row ${index < 3 ? "is-medal" : ""} ${!isEliminated && index >= 8 ? "is-bubble" : ""} ${isEliminated ? "is-eliminated" : ""}`}
              key={kol.id}
            >
              <span className="standing-rank">
                {index < 3 ? <Medal size={17} aria-hidden="true" /> : `#${index + 1}`}
              </span>
              <Avatar entrant={kol} />
              <div className="standing-name">
                <strong>{kol.name}</strong>
                <span>{kol.symbol}</span>
              </div>
              <div className="standing-stat">
                <span>Record</span>
                <strong>{kol.wins}-{kol.losses}</strong>
              </div>
              <div className="standing-stat">
                <span>Avg Gain</span>
                <strong>{kol.averageGain.toFixed(1)}%</strong>
              </div>
              <div className={`standing-stat standing-trend standing-trend--${trend.toLowerCase()}`}>
                <span>Trend</span>
                <strong>{trend}</strong>
              </div>
              <div className="standing-state">{state}</div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function RaceSchedule({
  currentRace,
  upcomingRaces,
}: {
  currentRace: RaceInterval;
  upcomingRaces: RaceInterval[];
}) {
  const schedule = buildSchedule(currentRace, upcomingRaces);

  return (
    <section className="content-section" id="schedule" aria-labelledby="schedule-title">
      <SectionHeading
        eyebrow="Upcoming Matches"
        title="Upcoming Matches"
        copy="Round 1 matchups are public in official seed order with a 1-hour intermission between races."
      />
      <div className="schedule-strip">
        {schedule.map((race, index) => (
          <article className={`schedule-card ${index === 0 ? "is-current" : ""}`} key={race.id}>
            <span>{index === 0 ? "Current race" : `Next ${index}`}</span>
            <strong>{race.label}</strong>
            <em>{race.entrants.length} KOLs · {formatTimeRange(race)}</em>
          </article>
        ))}
      </div>
    </section>
  );
}

function KolGrid({ field }: { field: LeagueKol[] }) {
  return (
    <section className="content-section" id="kols" aria-labelledby="kols-title">
      <SectionHeading
        eyebrow="Current KOLs"
        title="The field of 32."
        copy="Portraits, records, average gain, next match, and profile links for every Season 1 competitor."
      />
      <div className="kol-grid">
        {field.map((kol) => (
          <article className="kol-card" key={kol.id}>
            <Avatar entrant={kol} />
            <div className="kol-card-main">
              <strong>{kol.name}</strong>
              <span>{kol.symbol}</span>
            </div>
            <div className="kol-card-stats">
              <span>#{kol.leagueRank}</span>
              <span>{kol.wins}-{kol.losses}</span>
              <span>{kol.averageGain.toFixed(1)}%</span>
            </div>
            <p>{kol.upcomingRace}</p>
            <a href={kol.xUrl} target="_blank" rel="noreferrer">
              View Profile
              <ArrowUpRight size={15} aria-hidden="true" />
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}

function Resources() {
  return (
    <section className="content-section" id="resources" aria-labelledby="resources-title">
      <SectionHeading
        eyebrow="Daily Links"
        title="Everything fans need in one place."
        copy="The daily hub for watching, checking standings, buying, and following the tournament."
      />
      <div className="resource-grid">
        {resources.map(([label, href, Icon]) => {
          const isExternal = isExternalHref(href);

          return (
            <a
              className="resource-card"
              href={href}
              key={label}
              rel={isExternal ? "noreferrer" : undefined}
              target={isExternal ? "_blank" : undefined}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
              <ArrowRight size={15} aria-hidden="true" />
            </a>
          );
        })}
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer" aria-label="King of Liquidity footer">
      <div className="footer-brand">
        <img className="brand-logo" src={kolLogo} alt="" aria-hidden="true" />
        <div>
          <strong>King of Liquidity</strong>
          <span>Season 1 live. Season 2 begins after the crown.</span>
        </div>
      </div>
      <div className="footer-links">
        {resources.map(([label, href, Icon]) => {
          const isExternal = isExternalHref(href);

          return (
            <a href={href} key={label} rel={isExternal ? "noreferrer" : undefined} target={isExternal ? "_blank" : undefined}>
              <Icon size={15} aria-hidden="true" />
              <span>{label}</span>
            </a>
          );
        })}
      </div>
    </footer>
  );
}

function FinalCinematic() {
  return (
    <section className="final-cinematic" aria-label="Season 1 closing statement">
      <Crown size={34} aria-hidden="true" />
      <p>32 KOLs entered.</p>
      <p>One survived.</p>
      <p>One wears the crown.</p>
      <strong>Season 1 is live. Season 2 begins after the King is crowned.</strong>
    </section>
  );
}

function Faq() {
  return (
    <section className="content-section faq-section" id="faq" aria-labelledby="faq-title">
      <SectionHeading
        eyebrow="FAQ"
        title="The rules, without the noise."
        copy="Clear answers for new holders, daily viewers, and bracket chasers."
      />
      <div className="faq-grid">
        {faqs.map(([question, answer]) => (
          <article className="faq-card" key={question}>
            <strong>{question}</strong>
            <p>{answer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function KolOsNav() {
  const nav = [
    ["The Track", "/#track", Radio],
    ["Dashboard", "/dashboard", WalletCards],
    ["Standings", "/standings", Trophy],
    ["Bracket", "/bracket", Route],
    ["Schedule", "/schedule", CalendarDays],
    ["KOLs", "/kols", Users],
    ["How It Works", "/how-it-works", HelpCircle],
    ["Buy $KOL", buyKolUrl, CircleDollarSign],
    ["Dex", officialLinks.dex, BarChart3],
    ["X", officialLinks.x, ArrowUpRight],
    ["Telegram", officialLinks.telegram, Zap],
  ] as const;

  return (
    <nav className="kol-os" aria-label="KOL OS">
      <span className="kol-os-brand">KOL OS</span>
      <div>
        {nav.map(([label, href, Icon]) => {
          const isExternal = isExternalHref(href);

          return (
            <a href={href} key={label} rel={isExternal ? "noreferrer" : undefined} target={isExternal ? "_blank" : undefined}>
              <Icon size={15} aria-hidden="true" />
              <span>{label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}

function LiveRacePage({
  camera,
  countdown,
  entrants,
  field,
  isLiveRaceActive,
  race,
  setCamera,
  splitAmounts,
}: {
  camera: CameraMode;
  countdown: ReturnType<typeof getCountdownParts>;
  entrants: RaceEntrant[];
  field: LeagueKol[];
  isLiveRaceActive: boolean;
  race: RaceInterval;
  setCamera: (mode: CameraMode) => void;
  splitAmounts: ReturnType<typeof getSplitAmounts>;
}) {
  return (
    <main className="live-shell">
      <SiteHeader activeItem="track" />

      <section className="live-stage" aria-label="Live race broadcast">
        <div className="live-titlebar">
          <div>
            <p className="eyebrow">{race.label}</p>
            <h1>The Track</h1>
          </div>
          <Countdown countdown={countdown} label={isLiveRaceActive ? "Snapshot closes" : "Race opens"} />
        </div>

        <div className="camera-row broadcast-controls" role="group" aria-label="Race view">
          <span>Camera</span>
          <button
            className={camera === "top" ? "is-active" : ""}
            type="button"
            aria-pressed={camera === "top"}
            onClick={() => setCamera("top")}
          >
            Track
          </button>
          <button
            className={camera === "cinema" ? "is-active" : ""}
            type="button"
            aria-pressed={camera === "cinema"}
            onClick={() => setCamera("cinema")}
          >
            Side View
          </button>
        </div>

        <RaceTrack entrants={entrants} camera={camera} isLiveRaceActive={isLiveRaceActive} />
      </section>

      <aside className="live-sidebar" aria-label="Live race stats">
        <section className="live-panel">
          <span className="card-label">Leaderboard</span>
          {entrants.map((entrant) => (
            <div className="live-leader-row" key={entrant.id}>
              <span>#{entrant.rank}</span>
              <Avatar entrant={entrant} />
              <div>
                <strong>{entrant.name}</strong>
                <em>{formatCompactUsd(entrant.marketCapUsd)}</em>
              </div>
              <strong>{formatPercentChange(entrant.percentChange)}</strong>
            </div>
          ))}
        </section>

        <RewardPots splitAmounts={splitAmounts} />

        <KingOfHillPanel entrants={entrants} isLiveRaceActive={isLiveRaceActive} />

        <section className="live-panel">
          <span className="card-label">Tournament Watch</span>
          {field.slice(0, 4).map((kol) => (
            <div className="watch-row" key={kol.id}>
              <span>#{kol.leagueRank}</span>
              <strong>{kol.name}</strong>
              <em>{kol.averageGain.toFixed(1)}%</em>
            </div>
          ))}
        </section>
      </aside>
    </main>
  );
}

function KingOfHillPanel({
  entrants,
  isLiveRaceActive,
}: {
  entrants: RaceEntrant[];
  isLiveRaceActive: boolean;
}) {
  const king = entrants.find((entrant) => entrant.isLeader);
  const hasKing = Boolean(isLiveRaceActive && king);

  return (
    <section className={`live-panel king-hill-panel ${hasKing ? "is-active" : "is-idle"}`}>
      <span className="card-label">King of the Hill</span>
      <div className="winner-line">
        <Crown size={20} aria-hidden="true" />
        <strong>{hasKing && king ? king.name : "Next crown unclaimed"}</strong>
        <span>
          {hasKing && king
            ? `${king.symbol} holds the hill at ${formatPercentChange(king.percentChange)}`
            : "Cars are parked at the start line"}
        </span>
      </div>
    </section>
  );
}

function RaceTrack({
  entrants,
  camera,
  isLiveRaceActive,
}: {
  entrants: RaceEntrant[];
  camera: CameraMode;
  isLiveRaceActive: boolean;
}) {
  return (
    <div
      className={`race-track race-track--${camera} ${isLiveRaceActive ? "is-live" : "is-parked"}`}
      aria-label="Live KOL race positions"
    >
      <div className="start-line" aria-hidden="true">
        <span>START</span>
      </div>
      <div className="finish-line" aria-hidden="true">
        <span>FINISH</span>
      </div>

      {entrants.length > 0 ? (
        entrants.map((entrant) => (
          <div className={`track-lane ${entrant.isLeader ? "is-leader" : ""}`} key={entrant.id}>
            <div className="lane-label">
              <span className="lane-rank">#{entrant.rank}</span>
              <Avatar entrant={entrant} />
              <div className="lane-kol">
                <strong>{entrant.name}</strong>
                <span>{entrant.symbol}</span>
              </div>
              <div className="lane-stat">
                <span>Market cap</span>
                <strong>{formatCompactUsd(entrant.marketCapUsd)}</strong>
              </div>
              <div className={`lane-change ${entrant.percentChange >= 0 ? "is-positive" : "is-negative"}`}>
                <span>Change</span>
                <strong>{formatPercentChange(entrant.percentChange)}</strong>
              </div>
            </div>
            <div className="lane-runway" aria-hidden="true">
              <RacerMarker entrant={entrant} camera={camera} />
            </div>
          </div>
        ))
      ) : (
        <div className="track-empty">
          <strong>Next race begins soon</strong>
          <span>Cars will park at the start line when the next matchup is loaded.</span>
        </div>
      )}
    </div>
  );
}

function RacerMarker({
  entrant,
  camera,
}: {
  entrant: RaceEntrant;
  camera: CameraMode;
}) {
  return (
    <div
      className={`racer-marker racer-marker--${camera} ${entrant.isLeader ? "is-leader" : ""}`}
      style={
        {
          left: `${entrant.progress}%`,
          "--car-color": entrant.color,
        } as CSSProperties
      }
    >
      <span className="speed-trail" aria-hidden="true" />
      <span className="racer-callout" aria-hidden="true">
        <strong>{entrant.symbol}</strong>
        <em>{formatPercentChange(entrant.percentChange)}</em>
      </span>
      <span className="race-car" aria-hidden="true">
        <span className="race-car-shadow" />
        <span className="race-car-trail-light" />
        <span className="race-car-wing race-car-wing--rear" />
        <span className="race-car-wing race-car-wing--front" />
        <span className="race-car-body" />
        <span className="race-car-nose" />
        <span className="race-car-cockpit">
          <Avatar entrant={entrant} />
        </span>
        <span className="race-car-halo" />
        <span className="race-car-number">{entrant.carNumber ?? entrant.rank}</span>
        <span className="race-car-wheel race-car-wheel--rear" />
        <span className="race-car-wheel race-car-wheel--front" />
      </span>
    </div>
  );
}

function Avatar({ entrant }: { entrant: Pick<KolProfile, "avatarUrl" | "name" | "color"> }) {
  return (
    <span
      className="avatar"
      style={{ "--avatar-color": entrant.color } as CSSProperties}
      aria-hidden="true"
    >
      {entrant.avatarUrl ? (
        <img src={entrant.avatarUrl} alt="" />
      ) : (
        getInitials(entrant.name)
      )}
    </span>
  );
}

function Countdown({
  countdown,
  label,
}: {
  countdown: ReturnType<typeof getCountdownParts>;
  label: string;
}) {
  return (
    <div className="countdown" aria-label={label}>
      <span>{label}</span>
      <div className="time-grid">
        <TimeTile value={countdown.hours} label="HRS" />
        <TimeTile value={countdown.minutes} label="MIN" />
        <TimeTile value={countdown.seconds} label="SEC" />
      </div>
    </div>
  );
}

function TimeTile({ value, label }: { value: string; label: string }) {
  return (
    <span className="time-tile">
      <strong>{value}</strong>
      <small>{label}</small>
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy: string;
}) {
  return (
    <div className="section-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{copy}</p>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-pill">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MiniPot({ label, value }: { label: string; value: string }) {
  return (
    <div className="mini-pot">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function buildLeagueField(
  profiles: KolProfile[],
  currentRace: RaceInterval,
  entrants: RaceEntrant[],
): LeagueKol[] {
  const entrantById = new Map(entrants.map((entrant) => [entrant.id, entrant]));

  return profiles.map((kol, index) => {
    const entrant = entrantById.get(kol.id);

    return {
      ...kol,
      marketCapUsd: entrant?.marketCapUsd ?? kol.marketCapUsd,
      leagueRank: index + 1,
      averageGain: entrant?.percentChange ?? 0,
      upcomingRace: currentRace.entrants.includes(kol.id)
        ? currentRace.status === "live"
          ? "Live now"
          : "Next race"
        : `Round 1 Race ${Math.floor(index / 4) + 1}`,
    };
  });
}

function buildSchedule(currentRace: RaceInterval, upcomingRaces: RaceInterval[]): RaceInterval[] {
  return [currentRace, ...upcomingRaces.filter((race) => race.id !== currentRace.id)];
}

function formatTimeRange(race: RaceInterval): string {
  const start = new Date(race.startsAt);
  return start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return "Pending";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getCountdownTarget(race: RaceInterval, isLiveRaceActive: boolean): string {
  const target = isLiveRaceActive ? race.endsAt : race.startsAt;
  const targetDate = new Date(target);
  if (Number.isFinite(targetDate.getTime()) && targetDate.getTime() > Date.now()) {
    return target;
  }

  return new Date().toISOString();
}

export default App;
