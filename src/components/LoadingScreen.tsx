import { useEffect, useState } from "react";
import kolLogo from "../assets/logo/kol-logo.jpg";

const loadingMessages = [
  "Loading The Track",
  "Measuring Liquidity",
  "Preparing The Crown",
] as const;

interface LoadingScreenProps {
  active?: boolean;
}

export function LoadingScreen({ active = true }: LoadingScreenProps) {
  const [isMounted, setIsMounted] = useState(active);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (active) {
      setIsMounted(true);
      return undefined;
    }

    const timeout = window.setTimeout(() => setIsMounted(false), 420);
    return () => window.clearTimeout(timeout);
  }, [active]);

  useEffect(() => {
    if (!isMounted) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setMessageIndex((index) => (index + 1) % loadingMessages.length);
    }, 620);

    return () => window.clearInterval(interval);
  }, [isMounted]);

  if (!isMounted) {
    return null;
  }

  return (
    <div
      className={`loading-screen ${active ? "is-active" : "is-exiting"}`}
      role="status"
      aria-live="polite"
      aria-label={loadingMessages[messageIndex]}
    >
      <div className="loading-candles" aria-hidden="true" />
      <div className="loading-core">
        <img className="loading-logo" src={kolLogo} alt="KOL" />
        <div className="loading-race-line" aria-hidden="true" />
        <p>{loadingMessages[messageIndex]}</p>
      </div>
    </div>
  );
}
