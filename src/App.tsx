import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Activity,
  ArrowUpRight,
  CircleDollarSign,
  Crown,
  Flame,
  Radio,
  Sparkles,
  Trophy,
  WalletCards,
} from "lucide-react";
import {
  activeRace,
  kols,
  tournamentStats,
  upcomingRaces,
} from "./data/kols";
import { fetchLiveMarketCaps } from "./services/marketData";
import type { RaceEntrant } from "./types";
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

function App() {
  const [camera, setCamera] = useState<CameraMode>("top");
  const [countdown, setCountdown] = useState(() =>
    getCountdownParts(activeRace.endsAt),
  );
  const [liveCaps, setLiveCaps] = useState<Record<string, number>>({});

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCountdown(getCountdownParts(activeRace.endsAt));
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

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
  const leader = entrants[0];
  const splitAmounts = getSplitAmounts(activeRace);
  const sortedLeaderboard = [...kols].sort((a, b) => {
    const winDiff = b.wins - a.wins;
    if (winDiff !== 0) {
      return winDiff;
    }

    return (liveCaps[b.id] ?? b.marketCapUsd) - (liveCaps[a.id] ?? a.marketCapUsd);
  });

  return (
    <main className="app-shell">
      <div className="dashboard" aria-label="KOL King of Liquidity dashboard">
        <header className="topbar">
          <div className="brand-lockup">
            <CircleDollarSign size={22} aria-hidden="true" />
            <span>KOL King of Liquidity</span>
          </div>
          <div className="context-tag">
            <Sparkles size={15} aria-hidden="true" />
            Tournament Dashboard
          </div>
          <div className="live-status" aria-label="Tournament status">
            <span className="status-light" />
            <strong>{entrants.length}</strong>
            <span>active racers</span>
            <span className="divider" />
            <strong>{kols.length}</strong>
            <span>total KOLs</span>
          </div>
          <div className="top-actions">
            <button type="button" className="ghost-button">
              <Activity size={16} aria-hidden="true" />
              Live Stats
            </button>
            <button type="button" className="wallet-button">
              <WalletCards size={16} aria-hidden="true" />
              Connect Wallet
            </button>
          </div>
        </header>

        <section className="hero-panel" aria-labelledby="race-title">
          <div className="hero-copy">
            <p className="eyebrow">{activeRace.label}</p>
            <h1 id="race-title">$KOL Liquidity Grand Prix</h1>
            <p className="race-copy">
              KOLs race by live market cap. Each interval routes protocol fees
              into winner-holder rewards, $KOL holder airdrops, buybacks, burns,
              and the grand finals vault.
            </p>
            <div className="hero-badges" aria-label="Prize split highlights">
              <span>50% winner holders</span>
              <span>20% $KOL airdrop</span>
              <span>15% burn</span>
              <span>15% finals vault</span>
            </div>
          </div>

          <div className="countdown" aria-label="Race countdown">
            <span>Lights out in</span>
            <div className="time-grid">
              <TimeTile value={countdown.hours} label="HRS" />
              <TimeTile value={countdown.minutes} label="MIN" />
              <TimeTile value={countdown.seconds} label="SEC" />
            </div>
          </div>
        </section>

        <section className="track-section" aria-label="Race view">
          <div className="camera-row" role="group" aria-label="Race view">
            <span>View</span>
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

        <section className="leader-panel" aria-label="Pole position">
          <span className="panel-tab">Pole Position</span>
          <div className="leader-name">
            <Avatar entrant={leader} />
            <div>
              <strong>{leader.name}</strong>
              <span>{leader.symbol}</span>
            </div>
          </div>
          <div className="ticker-value" aria-label="Leader market cap">
            {formatCompactUsd(leader.marketCapUsd)}
          </div>
          <a className="icon-link" href={leader.xUrl} target="_blank" rel="noreferrer">
            <ArrowUpRight size={18} aria-hidden="true" />
            <span>X</span>
          </a>
        </section>

        <section className="info-grid" aria-label="Tournament race details">
          <PayoutPanel
            pot={getRacePot(activeRace)}
            raceKolFees={activeRace.entrantFeesSol}
            kolFees={activeRace.kolFeesSol}
            splitAmounts={splitAmounts}
          />
          <StatsPanel />
          <TournamentPanel />
        </section>

        <section className="leaderboard-section" aria-labelledby="leaderboard-title">
          <div className="section-title">
            <Trophy size={18} aria-hidden="true" />
            <h2 id="leaderboard-title">Leaderboard</h2>
          </div>
          <div className="leaderboard">
            {sortedLeaderboard.map((kol, index) => (
              <article className="leaderboard-row" key={kol.id}>
                <span className="rank">#{index + 1}</span>
                <Avatar entrant={kol} />
                <div className="kol-meta">
                  <strong>{kol.name}</strong>
                  <span>{kol.symbol}</span>
                </div>
                <div className="record">
                  <span>{kol.wins} W</span>
                  <span>{kol.losses} L</span>
                </div>
                <div className="cap">{formatCompactUsd(liveCaps[kol.id] ?? kol.marketCapUsd)}</div>
                <a
                  className="icon-button"
                  href={kol.xUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${kol.name} on X`}
                >
                  <ArrowUpRight size={17} aria-hidden="true" />
                </a>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
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
            <em>{entrant.symbol}</em>
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

function Avatar({ entrant }: { entrant: Pick<RaceEntrant, "avatarUrl" | "name" | "color"> }) {
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

function PayoutPanel({
  pot,
  kolFees,
  raceKolFees,
  splitAmounts,
}: {
  pot: number;
  kolFees: number;
  raceKolFees: number;
  splitAmounts: ReturnType<typeof getSplitAmounts>;
}) {
  const rows = [
    ["Winner holders", prizeSplit.winnerHolders, splitAmounts.winnerHolders],
    ["$KOL holders", prizeSplit.kolAirdrop, splitAmounts.kolAirdrop],
    ["Buyback + burn", prizeSplit.buybackBurn, splitAmounts.buybackBurn],
    ["Finals vault", prizeSplit.finalsVault, splitAmounts.finalsVault],
  ] as const;

  return (
    <section className="panel payout-panel" aria-labelledby="payout-title">
      <span className="panel-tab">Prize Pool</span>
      <div className="panel-heading">
        <Radio size={17} aria-hidden="true" />
        <h2 id="payout-title">{formatSol(pot)}</h2>
      </div>
      <div className="fee-sources">
        <span>$KOL fees {formatSol(kolFees)}</span>
        <span>Race KOLs {formatSol(raceKolFees)}</span>
      </div>
      <div className="split-list">
        {rows.map(([label, percent, amount]) => (
          <div className="split-row" key={label}>
            <span>{label}</span>
            <strong>{Math.round(percent * 100)}%</strong>
            <em>{formatSol(amount)}</em>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatsPanel() {
  return (
    <section className="panel stats-panel" aria-labelledby="stats-title">
      <span className="panel-tab">Protocol Stats</span>
      <div className="panel-heading">
        <Flame size={17} aria-hidden="true" />
        <h2 id="stats-title">Live Metrics</h2>
      </div>
      <div className="stat-stack">
        <Metric label="$KOL burned" value={formatNumber(tournamentStats.totalKolBurned)} />
        <Metric label="SOL airdropped" value={formatSol(tournamentStats.solAirdropped)} />
        <Metric label="Finals vault" value={formatSol(tournamentStats.finalsVaultSol)} />
        <Metric label="Fees tracked" value={formatSol(tournamentStats.totalFeesSol)} />
      </div>
    </section>
  );
}

function TournamentPanel() {
  const allRaces = [activeRace, ...upcomingRaces];

  return (
    <section className="panel tournament-panel" aria-labelledby="tournament-title">
      <span className="panel-tab">Grand Prix</span>
      <div className="panel-heading">
        <Crown size={17} aria-hidden="true" />
        <h2 id="tournament-title">16 KOLs</h2>
      </div>
      <div className="race-list">
        {allRaces.map((race) => (
          <div className={`race-chip race-chip--${race.status}`} key={race.id}>
            <span>{race.label}</span>
            <strong>{race.entrants.length} KOLs</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default App;
