import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { settlement } from "../dist/settlement.js";
import { CIRCLO_CONTRACTS } from "circlo-types";

// ─── Helpers ─────────────────────────────────────────────────────────────

/** Mocked viem WalletClient that captures every writeContract call. */
function makeMockWallet() {
  const calls = [];
  return {
    account: { address: "0x1111111111111111111111111111111111111111" },
    chain: { id: 42220 },
    writeContract: async (args) => {
      calls.push(args);
      return "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
    },
    calls,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe("settlement()", () => {
  it("posts a single writeContract call to PredictionPool.settlement", async () => {
    const wallet = makeMockWallet();

    const hash = await settlement(wallet);

    assert.equal(wallet.calls.length, 1, "exactly one tx should be sent");
    const call = wallet.calls[0];
    assert.equal(call.address, CIRCLO_CONTRACTS.PredictionPool);
    assert.equal(call.functionName, "settlement");
    assert.deepEqual(call.args, []);
    assert.equal(
      hash,
      "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    );
  });

  it("forwards the wallet's account + chain to writeContract", async () => {
    const wallet = makeMockWallet();
    await settlement(wallet);

    const call = wallet.calls[0];
    assert.equal(call.account, wallet.account);
    assert.equal(call.chain, wallet.chain);
  });

  it("throws if the wallet has no account configured", async () => {
    const wallet = { ...makeMockWallet(), account: undefined };
    await assert.rejects(() => settlement(wallet), {
      message: /walletClient must be configured with an account/,
    });
  });
});
