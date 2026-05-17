/**
 * read-stats.mjs — read total circles + goals + the 5 most recent goals.
 *
 * Pure read. No wallet, no gas. Demonstrates how to use the SDK from a
 * dashboard or indexer that just wants current totals + a sampling of
 * recent goals + pools.
 *
 * Run: node read-stats.mjs
 */
import {
  createCircloClient,
  parseGoalMetadata,
} from "circlo-sdk";
import { GoalStatus, UNRESOLVED_SIDE } from "circlo-types";
import { createPublicClient, formatUnits, http } from "viem";
import { celo } from "viem/chains";

const STATUS_NAME = ["Open", "Locked", "Resolving", "Resolved", "Disputed", "PaidOut"];

const publicClient = createPublicClient({ chain: celo, transport: http() });
const circlo = createCircloClient({ publicClient });

// 1. Totals
const [circleNextId, goalNextId] = await Promise.all([
  circlo.getCircleNextId(),
  circlo.getGoalNextId(),
]);
const circleTotal = circleNextId > 0n ? circleNextId - 1n : 0n;
const goalTotal = goalNextId > 0n ? goalNextId - 1n : 0n;

console.log("📊 Circlo on Celo Mainnet");
console.log("─".repeat(60));
console.log(`Total circles ever created: ${circleTotal}`);
console.log(`Total goals ever created:   ${goalTotal}`);
console.log();

// 2. Last 5 goals with their pool + status
if (goalTotal < 1n) {
  console.log("No goals yet.");
  process.exit(0);
}

const last5 = [];
const start = goalTotal;
const end = start - 4n > 0n ? start - 4n : 1n;
for (let i = start; i >= end; i--) {
  last5.push(i);
}

console.log(`📋 Most recent ${last5.length} goal(s)`);
console.log("─".repeat(60));

for (const id of last5) {
  const tuple = await circlo.getGoal(id);
  const [circleId, , , status, deadline, , totalPool, winningSide, metadataURI] =
    tuple;
  const meta = (() => {
    try {
      return parseGoalMetadata(metadataURI);
    } catch {
      return null;
    }
  })();

  const statusName = STATUS_NAME[Number(status)] ?? `?${status}`;
  const poolUsdt = formatUnits(totalPool, 6);
  const winSide =
    Number(winningSide) === UNRESOLVED_SIDE
      ? "—"
      : Number(winningSide) === 1
        ? "YES"
        : "NO";
  const dlSec = Number(deadline) - Math.floor(Date.now() / 1000);
  const dlStr =
    dlSec < 0 ? `expired ${(-dlSec / 3600).toFixed(1)}h ago` : `in ${(dlSec / 3600).toFixed(1)}h`;

  const question = meta?.question?.slice(0, 50) ?? "(no question)";

  console.log(
    `#${String(id).padStart(3)} circle=${String(circleId).padStart(2)}  ` +
      `${statusName.padEnd(8)}  pool=${poolUsdt.padStart(8)} USDT  ` +
      `winner=${winSide.padEnd(3)}  ${dlStr.padEnd(18)}  "${question}"`,
  );
}

console.log();
console.log(`(Goal status enum: ${STATUS_NAME.map((n, i) => `${i}=${n}`).join(", ")})`);
