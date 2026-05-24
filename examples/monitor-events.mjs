/**
 * monitor-events.mjs — stream Circlo events live as they hit Celo Mainnet.
 *
 * Subscribes to three event streams via the circlo-sdk watcher helpers:
 *   - CircleCreated  → emits when anyone makes a new circle
 *   - GoalCreated    → emits when anyone makes a new goal
 *   - Settlement     → emits whenever the permissionless settlement()
 *                      heartbeat is called (see tap-settlement.mjs)
 *
 * Stays running forever; Ctrl-C to stop. Useful as a starting point for
 * Discord/Telegram bots, dashboards, or alerting.
 *
 * Run: node monitor-events.mjs
 */
import {
  createCircloClient,
  parseCircleMetadata,
  parseGoalMetadata,
  watchCircleCreated,
  watchGoalCreated,
  watchSettlement,
} from "circlo-sdk";
import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";

const publicClient = createPublicClient({
  chain: celo,
  transport: http(), // forno.celo.org default
});

// The SDK doesn't strictly need this for watchers (they take publicClient
// directly), but constructing one gives you the contract addresses + every
// other read/write helper on the same object.
const circlo = createCircloClient({ publicClient });

console.log("📡 Subscribing to Circlo events on Celo Mainnet...");
console.log(`   CircleFactory:  ${circlo.contracts.CircleFactory}`);
console.log(`   PredictionPool: ${circlo.contracts.PredictionPool}`);
console.log(`   Ctrl-C to stop\n`);

const unsubCircles = watchCircleCreated(publicClient, (args) => {
  const meta = (() => {
    try {
      return parseCircleMetadata(args.metadataURI);
    } catch {
      return null;
    }
  })();
  const name = meta?.name ?? "(unnamed)";
  const privacy = args.isPrivate ? "🔒 private" : "🌐 public";
  console.log(
    `[${new Date().toISOString()}] CircleCreated #${args.id} ${privacy} ` +
      `"${name}" by ${args.owner.slice(0, 10)}...`,
  );
});

const unsubGoals = watchGoalCreated(publicClient, (args) => {
  const meta = (() => {
    try {
      return parseGoalMetadata(args.metadataURI);
    } catch {
      return null;
    }
  })();
  const question = meta?.question?.slice(0, 60) ?? "(no question)";
  const dlMinutes = (Number(args.deadline) - Math.floor(Date.now() / 1000)) / 60;
  console.log(
    `[${new Date().toISOString()}] GoalCreated   #${args.id} ` +
      `circle=${args.circleId} dl=+${dlMinutes.toFixed(0)}min ` +
      `"${question}" by ${args.creator.slice(0, 10)}...`,
  );
});

const unsubSettlement = watchSettlement(publicClient, (args) => {
  console.log(
    `[${new Date().toISOString()}] Settlement     ts=${args.timestamp} ` +
      `(${new Date(Number(args.timestamp) * 1000).toISOString()})`,
  );
});

// Clean unsub on Ctrl-C so the process exits promptly.
process.on("SIGINT", () => {
  console.log("\n👋 Stopping watchers...");
  unsubCircles();
  unsubGoals();
  unsubSettlement();
  process.exit(0);
});
