/**
 * tap-settlement.mjs — fire the permissionless Settlement heartbeat
 * on PredictionPool from a wallet you control on Celo Mainnet.
 *
 * Useful as:
 *   - an "I'm alive" health-check ping for off-chain dashboards
 *   - a cheap way to produce a Settlement(timestamp) event you can
 *     subscribe to (see monitor-events.mjs for the subscriber side)
 *
 * The function takes no arguments, transfers no value, and does not
 * touch the goal lifecycle. Gas ≈ 27k. Anyone can call it.
 *
 * Env:
 *   PRIVATE_KEY   the wallet that pays for gas (must hold a tiny
 *                 amount of CELO on Celo Mainnet — ~0.01 CELO is
 *                 plenty for many calls)
 *
 * Run: PRIVATE_KEY=0x... node tap-settlement.mjs
 */
import { settlement } from "circlo-sdk";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";

const rawPk = process.env.PRIVATE_KEY;
if (!rawPk) {
  console.error("Missing PRIVATE_KEY env var.");
  process.exit(1);
}
const pk = rawPk.startsWith("0x") ? rawPk : `0x${rawPk}`;

const account = privateKeyToAccount(pk);
const wallet = createWalletClient({ account, chain: celo, transport: http() });

console.log(`📡 Tapping settlement() on Celo Mainnet from ${account.address}…`);

const hash = await settlement(wallet);

console.log(`✅ tx hash: ${hash}`);
console.log(`   inspect: https://celoscan.io/tx/${hash}`);
console.log();
console.log(
  "Once the tx confirms, every watchSettlement() subscriber on this " +
    "chain will receive a Settlement(timestamp) event for this block.",
);
