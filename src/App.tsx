import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Crown,
  Flame,
  Gauge,
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
  tournamentStats,
  upcomingRaces,
} from "./data/kols";
import { fetchLiveMarketCaps } from "./services/marketData";
import type { KolProfile, RaceEntrant, RaceInterval } from "./types";
import {
  buildEntrants,
  formatCompactUsd,
  formatNumber,
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
  ["Live Race", "/live", Radio],
  ["Leaderboard", "#standings", Trophy],
  ["Season Schedule", "#schedule", CalendarDays],
  ["Current KOLs", "#kols", Users],
  ["Buy $KOL", "#", CircleDollarSign],
  ["DexScreener", "#", BarChart3],
  ["Twitter", "https://x.com", ArrowUpRight],
  ["Telegram", "#", Zap],
  ["FAQ", "#faq", HelpCircle],
] as const;

const faqs = [
  [
    "What is King of Liquidity?",
    "A 32-KOL market cap racing league where every race creates holder rewards and moves the season standings.",
  ],
  [
    "How does a race work?",
    "Every 90 minutes, four KOL tokens compete. The winner is decided by live market cap performance at the race snapshot.",
  ],
  [
    "How do rewards work?",
    "Race fees split to winning KOL holders, $KOL holders, buyback/burn, and the championship finals vault.",
  ],
  [
    "How do playoffs work?",
    "After 82 races, the top 16 qualify into quarterfinals, semifinals, and a championship final.",
  ],
  [
    "How do I qualify?",
    "Hold 100K+ $KOL for holder rewards, then hold the race-winning KOL to share in that winner holder pool.",
  ],
  [
    "When are payouts?",
    "Payout plans are generated after race snapshots, then executed by the Railway worker once payout execution is enabled.",
  ],
] as const;

function App() {
  const [camera, setCamera] = useState<CameraMode>("top");
  const countdownEndsAt = useMemo(() => getCountdownTarget(activeRace.endsAt), []);
  const [countdown, setCountdown] = useState(() =>
    getCountdownParts(countdownEndsAt),
  );
  const [liveCaps, setLiveCaps] = useState<Record<string, number>>({});

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCountdown(getCountdownParts(countdownEndsAt));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [countdownEndsAt]);

  useEffect(() => {
    let isMounted = true;

    fetchLiveMarketCaps(kols)
      .then((caps) => {
        if (isMounted) {
          setLiveCaps(caps);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLiveCaps({});
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const entrants = useMemo(
    () => buildEntrants(activeRace, kols, liveCaps),
    [liveCaps],
  );
  const splitAmounts = getSplitAmounts(activeRace);
  const field = useMemo(() => buildLeagueField(liveCaps), [liveCaps]);
  const standings = field.slice().sort((a, b) => {
    const winDiff = b.wins - a.wins;
    if (winDiff !== 0) {
      return winDiff;
    }

    return b.averageGain - a.averageGain;
  });
  const currentPath = window.location.pathname;

  if (currentPath === "/live" || currentPath === "/race") {
    return (
      <LiveRacePage
        camera={camera}
        countdown={countdown}
        entrants={entrants}
        field={field}
        setCamera={setCamera}
        splitAmounts={splitAmounts}
      />
    );
  }

  return (
    <main className="site-shell">
      <SiteHeader />
      <HeroSection countdown={countdown} entrants={entrants} splitAmounts={splitAmounts} />
      <CurrentRaceSummary entrants={entrants} countdown={countdown} splitAmounts={splitAmounts} />
      <HowItWorks />
      <LeagueStructure />
      <Standings standings={standings} />
      <RaceSchedule />
      <KolGrid field={field} />
      <Resources />
      <Faq />
    </main>
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
        <a href="#standings">Standings</a>
        <a href="#schedule">Schedule</a>
        <a href="#kols">KOLs</a>
        <a href="#faq">FAQ</a>
      </nav>
      <a className="nav-live" href="/live">
        <Radio size={16} aria-hidden="true" />
        Live Race
      </a>
    </header>
  );
}

function HeroSection({
  countdown,
  entrants,
  splitAmounts,
}: {
  countdown: ReturnType<typeof getCountdownParts>;
  entrants: RaceEntrant[];
  splitAmounts: ReturnType<typeof getSplitAmounts>;
}) {
  return (
    <section className="hero-section" aria-labelledby="hero-title">
      <div className="hero-content">
        <p className="eyebrow">Season One · Live League</p>
        <h1 id="hero-title">KING OF LIQUIDITY</h1>
        <p className="hero-kicker">32 KOLs. 82 Race Season. Live League.</p>
        <p className="hero-copy">
          Every race tracks real market cap performance. Every race pays
          holders. Top 16 qualify. One champion remains.
        </p>
        <div className="hero-actions">
          <a className="primary-cta" href="/live">
            <Play size={18} aria-hidden="true" />
            View Live Race
          </a>
          <a className="secondary-cta" href="#how-it-works">
            How It Works
            <ArrowRight size={18} aria-hidden="true" />
          </a>
        </div>
      </div>

      <aside className="hero-broadcast" aria-label="Current league snapshot">
        <div className="broadcast-status">
          <span className="status-light" />
          Race feed live
        </div>
        <div className="hero-matchup">
          {entrants.slice(0, 2).map((entrant) => (
            <div className="matchup-kol" key={entrant.id}>
              <Avatar entrant={entrant} />
              <span>{entrant.symbol}</span>
            </div>
          ))}
        </div>
        <Countdown countdown={countdown} label="Next snapshot" />
        <div className="mini-pots">
          <MiniPot label="Winner pool" value={formatSol(splitAmounts.winnerHolders)} />
          <MiniPot label="$KOL holders" value={formatSol(splitAmounts.kolAirdrop)} />
        </div>
      </aside>
    </section>
  );
}

function CurrentRaceSummary({
  entrants,
  countdown,
  splitAmounts,
}: {
  entrants: RaceEntrant[];
  countdown: ReturnType<typeof getCountdownParts>;
  splitAmounts: ReturnType<typeof getSplitAmounts>;
}) {
  const winner = entrants[0];

  return (
    <section className="league-dashboard" aria-label="Homepage race overview">
      <div className="dashboard-card matchup-card">
        <span className="card-label">Current Matchup</span>
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

      <div className="dashboard-card countdown-card">
        <span className="card-label">Race Countdown</span>
        <Countdown countdown={countdown} label="Lights out" />
        <a className="enter-live" href="/live">
          Enter Live Race
          <ArrowRight size={17} aria-hidden="true" />
        </a>
      </div>

      <RewardPots splitAmounts={splitAmounts} />

      <div className="dashboard-card standings-card">
        <span className="card-label">Current Leader</span>
        <div className="leader-feature">
          <Avatar entrant={winner} />
          <div>
            <strong>{winner.name}</strong>
            <span>{winner.symbol} · pole position</span>
          </div>
        </div>
        <div className="leader-number">{formatCompactUsd(winner.marketCapUsd)}</div>
      </div>
    </section>
  );
}

function RewardPots({ splitAmounts }: { splitAmounts: ReturnType<typeof getSplitAmounts> }) {
  const pots = [
    ["Winning KOL Pot", splitAmounts.winnerHolders, Trophy],
    ["KOL Holder Pot", splitAmounts.kolAirdrop, WalletCards],
    ["Burn", splitAmounts.buybackBurn, Flame],
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
    ["Step 2", "Every 90 minutes four KOLs compete"],
    ["Step 3", "Highest market cap performance wins"],
    ["Step 4", "Creator fees split 50% winner holders, 20% $KOL holders, 15% burn, 15% finals vault"],
    ["Step 5", "After 82 races, top 16 qualify, playoffs begin, one champion remains"],
  ];

  return (
    <section className="content-section" id="how-it-works" aria-labelledby="how-title">
      <SectionHeading
        eyebrow="How It Works"
        title="A league people can follow every day."
        copy="Simple race rules, visible reward pots, and standings that matter all season."
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

function LeagueStructure() {
  const bracket = ["Season", "Top 16", "Quarterfinals", "Semifinals", "Championship"];

  return (
    <section className="content-section league-section" aria-labelledby="league-title">
      <SectionHeading
        eyebrow="League Structure"
        title="32 KOLs. 82 races. One title."
        copy="A full season feeds into a playoff bracket, turning every interval into a standings event."
      />
      <div className="league-format">
        <div className="format-stats">
          <MetricPill label="Season Field" value="32 KOLs" />
          <MetricPill label="Regular Season" value="82 races" />
          <MetricPill label="Cut Line" value="Top 16" />
          <MetricPill label="Final" value="1 champion" />
        </div>
        <div className="bracket" aria-label="Playoff bracket">
          {bracket.map((round, index) => (
            <div className="bracket-node" key={round}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{round}</strong>
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
        title="The playoff race is the product."
        copy="Top 16 qualify. Bubble positions fight to survive. Everyone else is chasing the cut."
      />
      <div className="standings-table" role="table" aria-label="League standings">
        {standings.slice(0, 20).map((kol, index) => (
          <article
            className={`standing-row ${index < 3 ? "is-medal" : ""} ${index >= 12 && index < 16 ? "is-bubble" : ""} ${index >= 16 ? "is-eliminated" : ""}`}
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
            <div className="standing-state">
              {index < 16 ? (index >= 12 ? "Bubble" : "Top 16") : "Eliminated"}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function RaceSchedule() {
  const schedule = buildSchedule();

  return (
    <section className="content-section" id="schedule" aria-labelledby="schedule-title">
      <SectionHeading
        eyebrow="Race Schedule"
        title="Current race plus the next six."
        copy="The admin worker can store the full season privately. The homepage stays focused on what fans need now."
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
        copy="Portraits, rank, record, average gain, and upcoming race info live in one clean grid."
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
    <section className="content-section" aria-labelledby="resources-title">
      <SectionHeading
        eyebrow="Daily Links"
        title="Everything fans need in one place."
        copy="Resources replace scattered links and make the league feel easy to follow."
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

function Faq() {
  return (
    <section className="content-section faq-section" id="faq" aria-labelledby="faq-title">
      <SectionHeading
        eyebrow="FAQ"
        title="The rules, without the noise."
        copy="Clear answers for new holders, daily viewers, and playoff chasers."
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

function LiveRacePage({
  camera,
  countdown,
  entrants,
  field,
  setCamera,
  splitAmounts,
}: {
  camera: CameraMode;
  countdown: ReturnType<typeof getCountdownParts>;
  entrants: RaceEntrant[];
  field: LeagueKol[];
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
          Live Race Feed
        </div>
        <a className="secondary-cta compact" href="/">
          League Home
          <ArrowRight size={16} aria-hidden="true" />
        </a>
      </header>

      <section className="live-stage" aria-label="Live race broadcast">
        <div className="live-titlebar">
          <div>
            <p className="eyebrow">{activeRace.label}</p>
            <h1>Live Race</h1>
          </div>
          <Countdown countdown={countdown} label="Snapshot closes" />
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

        <RaceTrack entrants={entrants} camera={camera} />
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
              <strong>{getPerformanceGain(entrant).toFixed(1)}%</strong>
            </div>
          ))}
        </section>

        <RewardPots splitAmounts={splitAmounts} />

        <section className="live-panel">
          <span className="card-label">Winner Line</span>
          <div className="winner-line">
            <Shield size={20} aria-hidden="true" />
            <strong>{entrants[0].name}</strong>
            <span>{entrants[0].symbol} leads by market cap</span>
          </div>
        </section>

        <section className="live-panel">
          <span className="card-label">Season Watch</span>
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
}: {
  entrants: RaceEntrant[];
  camera: CameraMode;
}) {
  return (
    <div
      className={`race-track race-track--${camera}`}
      aria-label="Live KOL race positions"
    >
      <div className="finish-line" aria-hidden="true">
        <span>FINISH</span>
      </div>

      {entrants.map((entrant) => (
        <div className="track-lane" key={entrant.id}>
          <div className="lane-label">
            <span>#{entrant.rank}</span>
            <strong>{entrant.name}</strong>
            <em>{getPerformanceGain(entrant).toFixed(1)}%</em>
          </div>
          <RacerMarker entrant={entrant} camera={camera} />
        </div>
      ))}
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
      className={`racer-marker racer-marker--${camera}`}
      style={{ left: `${entrant.progress}%`, "--car-color": entrant.color } as CSSProperties}
    >
      <span className="speed-trail" aria-hidden="true" />
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

function buildLeagueField(liveCaps: Record<string, number>): LeagueKol[] {
  const base = kols.map((kol, index) => ({
    ...kol,
    marketCapUsd: liveCaps[kol.id] ?? kol.marketCapUsd,
    leagueRank: index + 1,
    averageGain: Number((12.8 - index * 0.72 + kol.wins * 1.9 - kol.losses * 0.8).toFixed(1)),
    upcomingRace: index < 16 ? `Race ${Math.floor(index / 4) + 1}` : `Qualifier ${index - 15}`,
  }));

  const placeholders: LeagueKol[] = Array.from({ length: 16 }, (_, index) => {
    const number = index + 17;
    return {
      id: `kol-${number}`,
      name: `KOL Slot ${number}`,
      symbol: `$KOL${number}`,
      xHandle: "@comingsoon",
      xUrl: "https://x.com",
      wins: Math.max(0, 2 - Math.floor(index / 5)),
      losses: Math.floor(index / 4),
      seed: number,
      color: ["#d8b76a", "#25c7b0", "#ff7467", "#7c8cff"][index % 4],
      marketCapUsd: 210000 - index * 8200,
      leagueRank: number,
      averageGain: Number((1.6 - index * 0.36).toFixed(1)),
      upcomingRace: "Waiting list",
      isPlaceholder: true,
    };
  });

  return [...base, ...placeholders].map((kol, index) => ({
    ...kol,
    leagueRank: index + 1,
  }));
}

function buildSchedule(): RaceInterval[] {
  const generated = Array.from({ length: 3 }, (_, index) => {
    const lastUpcoming = upcomingRaces[upcomingRaces.length - 1];
    const start = new Date(lastUpcoming?.endsAt ?? activeRace.endsAt);
    start.setMinutes(start.getMinutes() + index * 90);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 90);

    return {
      id: `race-extra-${index + 1}`,
      label: `Round 2 · Heat ${String.fromCharCode(65 + index)}`,
      status: "queued" as const,
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      entrants: kols.slice(index * 4, index * 4 + 4).map((kol) => kol.id),
      kolFeesSol: 0,
      entrantFeesSol: 0,
    };
  });

  return [activeRace, ...upcomingRaces, ...generated].slice(0, 7);
}

function formatTimeRange(race: RaceInterval): string {
  const start = new Date(race.startsAt);
  return start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getPerformanceGain(entrant: Pick<RaceEntrant, "rank" | "marketCapUsd">): number {
  return Number((18.5 - entrant.rank * 2.35 + (entrant.marketCapUsd % 37000) / 10000).toFixed(1));
}

function getCountdownTarget(endsAt: string): string {
  const end = new Date(endsAt);
  if (end.getTime() > Date.now()) {
    return endsAt;
  }

  return new Date(Date.now() + 54 * 60 * 1000 + 18 * 1000).toISOString();
}

export default App;
