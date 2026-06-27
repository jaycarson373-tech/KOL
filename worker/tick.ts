import { runRaceEngineTick } from "./services/race-engine.js";

runRaceEngineTick({ source: "worker" })
  .then(() => {
    console.log(`[kol] one-shot tick complete at ${new Date().toISOString()}`);
  })
  .catch((error) => {
    console.error("[kol] one-shot tick failed", error);
    process.exit(1);
  });
