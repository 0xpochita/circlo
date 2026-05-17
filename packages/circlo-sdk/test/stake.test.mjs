import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { stake } from "../dist/stakes.js";

// ─── Helpers ─────────────────────────────────────────────────────────────

/**
 * Build a minimal mocked viem WalletClient. Captures every writeContract
 * call so tests can assert order + args.
 */
function makeMockWallet() {
  const calls = [];
  const wallet = {
    account: { address: "0x1111111111111111111111111111111111111111" },
    chain: { id: 42220 },
    writeContract: async (args) => {
      calls.push(args);
      // distinguish approve vs stake by functionName so tests can branch
      return args.functionName === "approve"
        ? "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        : "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    },
    extend: () => wallet, // unused because we always pass publicClientOverride
  };
  return { wallet, calls };
}

/**
 * Build a minimal mocked viem PublicClient with a fixed USDT allowance
 * the first read returns. waitForTransactionReceipt always succeeds.
 */
function makeMockPublic({ allowance }) {
  const calls = [];
  return {
    readContract: async (args) => {
      calls.push(args);
      // We only ever read USDT allowance in stake() — return what the test wants.
      if (args.functionName === "allowance") return allowance;
      throw new Error(`unexpected readContract: ${args.functionName}`);
    },
    waitForTransactionReceipt: async () => ({ status: "success" }),
  };
}

const ONE_USDT = BigInt(1_000_000);
const STAKE_AMT = BigInt(1_000); // 0.001 USDT

// ─── Tests ───────────────────────────────────────────────────────────────

describe("stake() — auto-approve flow", () => {
  it("skips approve when existing allowance is sufficient", async () => {
    const { wallet, calls: walletCalls } = makeMockWallet();
    const publicMock = makeMockPublic({ allowance: ONE_USDT });

    const result = await stake(
      wallet,
      { goalId: 1n, side: 1, amount: STAKE_AMT },
      publicMock,
    );

    // Exactly one write — the stake itself.
    assert.equal(walletCalls.length, 1);
    assert.equal(walletCalls[0].functionName, "stake");
    assert.equal(result.approveHash, undefined);
    assert.ok(result.stakeHash.startsWith("0xbb"));
  });

  it("sends approve THEN stake when allowance is below the amount", async () => {
    const { wallet, calls: walletCalls } = makeMockWallet();
    const publicMock = makeMockPublic({ allowance: BigInt(0) });

    const result = await stake(
      wallet,
      { goalId: 1n, side: 1, amount: STAKE_AMT },
      publicMock,
    );

    // Two writes — approve first, then stake.
    assert.equal(walletCalls.length, 2);
    assert.equal(walletCalls[0].functionName, "approve");
    assert.equal(walletCalls[1].functionName, "stake");
    assert.ok(result.approveHash);
    assert.ok(result.approveHash.startsWith("0xaa"));
    assert.ok(result.stakeHash.startsWith("0xbb"));
  });

  it("never approves when autoApprove is false, even if allowance is zero", async () => {
    const { wallet, calls: walletCalls } = makeMockWallet();
    const publicMock = makeMockPublic({ allowance: BigInt(0) });

    const result = await stake(
      wallet,
      { goalId: 1n, side: 1, amount: STAKE_AMT, autoApprove: false },
      publicMock,
    );

    // Exactly one write — caller takes responsibility for prior approval.
    assert.equal(walletCalls.length, 1);
    assert.equal(walletCalls[0].functionName, "stake");
    assert.equal(result.approveHash, undefined);
  });

  it("forwards side + amount + goalId verbatim to the stake call", async () => {
    const { wallet, calls } = makeMockWallet();
    const publicMock = makeMockPublic({ allowance: ONE_USDT });

    await stake(wallet, { goalId: 117n, side: 0, amount: STAKE_AMT }, publicMock);

    const stakeCall = calls.find((c) => c.functionName === "stake");
    assert.equal(stakeCall.args[0], 117n);
    assert.equal(stakeCall.args[1], 0);
    assert.equal(stakeCall.args[2], STAKE_AMT);
  });

  it("rejects when the wallet has no account configured", async () => {
    const wallet = { account: undefined };
    const publicMock = makeMockPublic({ allowance: ONE_USDT });

    await assert.rejects(
      () => stake(wallet, { goalId: 1n, side: 1, amount: STAKE_AMT }, publicMock),
      /stake: walletClient must be configured with an account/,
    );
  });
});
