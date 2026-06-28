import { useEffect, useMemo, useState, type CSSProperties } from "react";
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
  Play,
  Radio,
  Route,
  Shield,
  Trophy,
  Users,
  WalletCards,
  Zap,
} from "lucide-react";
import {
  activeRace,
  kols,
  upcomingRaces as fallbackUpcomingRaces,
} from "./data/kols";
import { fetchCurrentRaceFeed, type RaceFeed } from "./services/raceFeed";
import type { KolProfile, RaceEntrant, RaceInterval } from "./types";
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

const resources = [
  ["Live Race", "/track", Radio],
  ["Standings", "#standings", Trophy],
  ["Bracket", "#bracket", Route],
  ["Schedule", "#schedule", CalendarDays],
  ["Current KOLs", "#kols", Users],
  ["Buy $KOL", "#", CircleDollarSign],
  ["DexScreener", "#", BarChart3],
  ["Twitter", "https://x.com", ArrowUpRight],
  ["Telegram", "#", Zap],
  ["FAQ", "#faq", HelpCircle],
] as const;

const fallbackRaceFeed: RaceFeed = {
  race: {
    ...activeRace,
    status: "queued",
    snapshotStart: null,
    snapshotEnd: null,
    liveMarketCaps: null,
  },
  kols,
  upcomingRaces: fallbackUpcomingRaces,
  isLiveRaceActive: false,
  isConfigured: false,
};

const faqs = [
  [
    "What is King of Liquidity?",
    "Season One is a 32-KOL tournament where market cap performance decides who advances toward the crown.",
  ],
  [
    "How does a race work?",
    "Four KOLs enter The Track, race for a fixed window, and the highest ending market cap performance wins.",
  ],
  [
    "How are rewards split?",
    "Race fees split 50% to winning coin holders, 20% to $KOL holders, 10% to the winning KOL, 10% to burn, and 10% to the championship vault.",
  ],
  [
    "How do I qualify?",
    "Hold 100K+ $KOL for $KOL-holder rewards. Hold the winning coin to share in that race's winner-holder pool.",
  ],
  [
    "What is the tournament format?",
    "Round 1 has eight 4-KOL races at 8 hours each. Elite 8 has two 4-KOL races at 10 hours each. The Grand Final is a 20-hour 1v1.",
  ],
  [
    "When are payouts?",
    "Payout plans are generated after race snapshots, then executed by the Railway worker once payout execution is enabled.",
  ],
  [
    "How does Season Two work?",
    "After the King is crowned, Season Two begins with a fresh field and a new path to the title.",
  ],
] as const;

function App() {
  const [camera, setCamera] = useState<CameraMode>("top");
  const [raceFeed, setRaceFeed] = useState<RaceFeed>(fallbackRaceFeed);
  const currentRace = raceFeed.race ?? fallbackRaceFeed.race!;
  const raceProfiles = raceFeed.kols.length > 0 ? raceFeed.kols : fallbackRaceFeed.kols;
  const currentUpcomingRaces =
    raceFeed.upcomingRaces.length > 0 ? raceFeed.upcomingRaces : fallbackRaceFeed.upcomingRaces;
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
    let isMounted = true;
    let interval: number | undefined;

    const loadRaceFeed = () => {
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

  if (currentPath === "/live" || currentPath === "/race" || currentPath === "/track") {
    return (
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
    );
  }

  return (
    <>
      <main className="site-shell">
        <SiteHeader />
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
        />
        <CurrentRaceSummary
          entrants={entrants}
          isLiveRaceActive={isLiveRaceActive}
          race={currentRace}
          splitAmounts={splitAmounts}
        />
        <section className="content-section reward-pots-section" aria-labelledby="rewards-title">
          <SectionHeading
            eyebrow="Reward Pots"
            title="Every race pays five pools."
            copy="The current race pot is split across winner holders, $KOL holders, the winning KOL, burn, and the championship vault."
          />
          <RewardPots splitAmounts={splitAmounts} />
        </section>
        <HowItWorks />
        <TournamentBracket />
        <Standings standings={standings} />
        <RaceSchedule currentRace={currentRace} upcomingRaces={currentUpcomingRaces} />
        <KolGrid field={field} />
        <Resources />
        <FinalCinematic />
        <Faq />
      </main>
      <KolOsNav />
    </>
  );
}

function SiteHeader() {
  return (
    <header className="site-header">
      <a className="brand-lockup" href="/" aria-label="King of Liquidity home">
        <CircleDollarSign size={23} aria-hidden="true" />
        <span>KOL</span>
        <strong>King of Liquidity</strong>
      </a>
      <nav className="site-nav" aria-label="Primary navigation">
        <a href="#track">Track</a>
        <a href="#standings">Standings</a>
        <a href="#bracket">Bracket</a>
        <a href="#schedule">Schedule</a>
        <a href="#kols">KOLs</a>
      </nav>
      <a className="nav-live" href="/track">
        <Radio size={16} aria-hidden="true" />
        The Track
      </a>
    </header>
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
  const leader = entrants[0];
  const racePot = getRacePot(race);

  return (
    <section className="hero-section" aria-labelledby="hero-title">
      <div className="hero-content">
        <p className="eyebrow">Season One · Live Tournament</p>
        <h1 id="hero-title">KING OF LIQUIDITY</h1>
        <p className="hero-kicker">32 KOLs. One tournament. One crown.</p>
        <p className="hero-copy">
          Four KOLs enter The Track. Market cap performance decides who
          advances. Every race pays holders.
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
}: {
  entrants: RaceEntrant[];
  countdown: ReturnType<typeof getCountdownParts>;
  isLiveRaceActive: boolean;
  race: RaceInterval;
}) {
  return (
    <section className="track-section" id="track" aria-labelledby="track-title">
      <div className="track-header">
        <div>
          <p className="eyebrow">The Track</p>
          <h2 id="track-title">{isLiveRaceActive ? "Live tournament race" : "Next race begins soon"}</h2>
          <p className="track-subtitle">{race.label}</p>
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
      {race.status === "final" ? <RaceResult entrants={entrants} race={race} /> : null}
    </section>
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
  const winner = entrants[0];
  const totalMarketCap = entrants.reduce((total, entrant) => total + entrant.marketCapUsd, 0);
  const racePot = getRacePot(race);

  return (
    <section className="race-summary-grid" aria-label="Homepage race overview">
      <div className="dashboard-card standings-card">
        <span className="card-label">{isLiveRaceActive ? "Current Leader" : "Track Status"}</span>
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
            <strong>Next race begins soon</strong>
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
      <span>Winner</span>
      <strong>{winner.name}</strong>
      <em>{formatPercentChange(winner.percentChange)} · {formatSol(getRacePot(race) * prizeSplit.winnerHolders)} paid to winner holders</em>
    </div>
  );
}

function RewardPots({ splitAmounts }: { splitAmounts: ReturnType<typeof getSplitAmounts> }) {
  const pots = [
    ["Winning Coin Holders", splitAmounts.winnerHolders, Trophy],
    ["$KOL Holders", splitAmounts.kolAirdrop, WalletCards],
    ["Winning KOL Bonus", splitAmounts.winningKolBonus, Medal],
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
    ["Step 1", "Hold 100K+ $KOL"],
    ["Step 2", "4 KOLs enter The Track"],
    ["Step 3", "Highest ending market cap performance wins"],
    ["Step 4", "Creator fees split 50% / 20% / 10% / 10% / 10%"],
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
      label: "Round 1",
      detail: "8 races · 4 KOLs each · 8 hours",
      matches: ["R32 Race 1", "R32 Race 2", "R32 Race 3", "R32 Race 4", "R32 Race 5", "R32 Race 6", "R32 Race 7", "R32 Race 8"],
    },
    {
      label: "Elite 8",
      detail: "2 races · 4 KOLs each · 10 hours",
      matches: ["Elite Race 1", "Elite Race 2"],
    },
    {
      label: "Grand Final",
      detail: "1v1 · 20 hours",
      matches: ["Crown Match"],
    },
    {
      label: "King of Liquidity",
      detail: "Season One champion",
      matches: ["Crowned"],
    },
  ];

  return (
    <section className="content-section bracket-section" id="bracket" aria-labelledby="bracket-title">
      <SectionHeading
        eyebrow="Tournament Bracket"
        title="32 enter. One survives."
        copy="Season One moves from eight opening races to the Elite 8, then into a 20-hour Grand Final for the crown."
      />
      <div className="league-format">
        <div className="format-stats">
          <MetricPill label="Season Field" value="32 KOLs" />
          <MetricPill label="Opening Round" value="8 races" />
          <MetricPill label="Elite 8" value="2 races" />
          <MetricPill label="Grand Final" value="1v1" />
        </div>
        <div className="bracket" aria-label="Season One tournament bracket">
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

function Standings({ standings }: { standings: LeagueKol[] }) {
  return (
    <section className="content-section" id="standings" aria-labelledby="standings-title">
      <SectionHeading
        eyebrow="Standings"
        title="Who is still alive?"
        copy="Top positions lead the field, contenders stay in the bracket, and eliminated KOLs fall out of Season One."
      />
      <div className="standings-table" role="table" aria-label="Tournament standings">
        {standings.slice(0, 32).map((kol, index) => {
          const isEliminated = kol.losses > 0 || index >= 24;
          const state = isEliminated ? "Eliminated" : index < 8 ? "Top Seed" : "Contender";

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
        title="Current race plus the next six."
        copy="Future rounds stay hidden until the bracket earns them."
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
        copy="Portraits, records, average gain, next match, and profile links for every Season One competitor."
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
        {resources.map(([label, href, Icon]) => (
          <a className="resource-card" href={href} key={label}>
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
            <ArrowRight size={15} aria-hidden="true" />
          </a>
        ))}
      </div>
    </section>
  );
}

function FinalCinematic() {
  return (
    <section className="final-cinematic" aria-label="Season One closing statement">
      <Crown size={34} aria-hidden="true" />
      <p>32 KOLs.</p>
      <p>One survives.</p>
      <p>One wears the crown.</p>
      <strong>Season One is live. Season Two begins after the King is crowned.</strong>
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
    ["The Track", "#track", Radio],
    ["Standings", "#standings", Trophy],
    ["Bracket", "#bracket", Route],
    ["KOLs", "#kols", Users],
    ["Links", "#resources", ArrowUpRight],
    ["FAQ", "#faq", HelpCircle],
    ["Buy $KOL", "#", CircleDollarSign],
    ["Dex", "#", BarChart3],
    ["Twitter", "https://x.com", ArrowUpRight],
    ["Telegram", "#", Zap],
  ] as const;

  return (
    <nav className="kol-os" aria-label="KOL OS">
      <span className="kol-os-brand">KOL OS</span>
      <div>
        {nav.map(([label, href, Icon]) => (
          <a href={href} key={label}>
            <Icon size={15} aria-hidden="true" />
            <span>{label}</span>
          </a>
        ))}
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
      <header className="live-header">
        <a className="brand-lockup" href="/" aria-label="Back to King of Liquidity home">
          <CircleDollarSign size={23} aria-hidden="true" />
          <span>KOL</span>
          <strong>King of Liquidity</strong>
        </a>
        <div className="live-header-center">
          <span className="status-light" />
          {isLiveRaceActive ? "The Track Feed" : "Next Race"}
        </div>
        <a className="secondary-cta compact" href="/">
          Tournament Home
          <ArrowRight size={16} aria-hidden="true" />
        </a>
      </header>

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

        <section className="live-panel">
          <span className="card-label">Winner Line</span>
          <div className="winner-line">
            <Shield size={20} aria-hidden="true" />
            <strong>{isLiveRaceActive && entrants[0] ? entrants[0].name : "Next race begins soon"}</strong>
            <span>
              {isLiveRaceActive && entrants[0]
                ? `${entrants[0].symbol} leads by market cap performance`
                : "Cars are parked at the start line"}
            </span>
          </div>
        </section>

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
            <RacerMarker entrant={entrant} camera={camera} />
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
      <span className="lambo" aria-hidden="true">
        <span className="lambo-body" />
        <span className="lambo-cabin" />
        <span className="lambo-hood" />
        <span className="lambo-wing" />
        <span className="lambo-light lambo-light--front" />
        <span className="lambo-light lambo-light--rear" />
        <span className="lambo-wheel lambo-wheel--front" />
        <span className="lambo-wheel lambo-wheel--rear" />
      </span>
      <Avatar entrant={entrant} />
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
  return [currentRace, ...upcomingRaces.filter((race) => race.id !== currentRace.id)].slice(0, 7);
}

function formatTimeRange(race: RaceInterval): string {
  const start = new Date(race.startsAt);
  return start.toLocaleTimeString("en-US", {
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
