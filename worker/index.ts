import { config } from "./config.js";
import { runRaceEngineTick } from "./services/race-engine.js";

async function runOnce(source = "worker") {
  await runRaceEngineTick({ source });
  console.log(`[kol] worker tick complete at ${new Date().toISOString()}`);
}

async function runDaemonTick() {
  await runOnce().catch((error) => {
    console.error("[kol] worker tick failed", error);
  });
}

async function main() {
  if (config.workerMode === "daemon") {
    console.log(`[kol] worker daemon started with ${config.workerPollMs}ms polling`);
    await runDaemonTick();

    const timer = setInterval(() => {
      void runDaemonTick();
    }, config.workerPollMs);

    process.on("SIGTERM", () => {
      clearInterval(timer);
      process.exit(0);
    });
    process.on("SIGINT", () => {
      clearInterval(timer);
      process.exit(0);
    });

    return;
  }

  await runOnce();
}

main().catch((error) => {
  console.error("[kol] worker failed", error);
  process.exit(1);
});
