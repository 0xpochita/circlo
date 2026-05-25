import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import {
  CircloSdkError,
  NotConfiguredError,
  EventNotFoundError,
  TxRevertedError,
  createCircloClient,
  isSdkError,
} from "../dist/index.js";

describe("CircloSdkError hierarchy", () => {
  it("NotConfiguredError extends CircloSdkError", () => {
    const e = new NotConfiguredError("createCircle", "walletClient");
    assert.ok(e instanceof CircloSdkError);
    assert.ok(e instanceof NotConfiguredError);
    assert.equal(e.name, "NotConfiguredError");
    assert.equal(e.operation, "createCircle");
    assert.equal(e.missing, "walletClient");
  });

  it("EventNotFoundError carries txHash and eventName", () => {
    const e = new EventNotFoundError("CircleCreated", "0xabc123");
    assert.ok(e instanceof CircloSdkError);
    assert.equal(e.eventName, "CircleCreated");
    assert.equal(e.txHash, "0xabc123");
    assert.match(e.message, /CircleCreated/);
    assert.match(e.message, /0xabc123/);
  });

  it("TxRevertedError carries operation and txHash", () => {
    const e = new TxRevertedError("stake", "0xdef456");
    assert.ok(e instanceof CircloSdkError);
    assert.equal(e.operation, "stake");
    assert.equal(e.txHash, "0xdef456");
  });

  it("walletless client rejects createCircle with a NotConfiguredError", async () => {
    const client = createCircloClient();
    try {
      await client.createCircle({ name: "x", privacy: "public" });
      assert.fail("expected rejection");
    } catch (e) {
      assert.ok(e instanceof NotConfiguredError);
      assert.equal(e.missing, "walletClient");
      assert.equal(e.operation, "createCircle");
    }
  });

  it("publicless client rejects isCircleMember with a NotConfiguredError", async () => {
    const client = createCircloClient();
    try {
      await client.isCircleMember(1n, "0x0000000000000000000000000000000000000000");
      assert.fail("expected rejection");
    } catch (e) {
      assert.ok(e instanceof NotConfiguredError);
      assert.equal(e.missing, "publicClient");
    }
  });

  it("structured payload survives JSON round-trip via spread", () => {
    // Errors aren't JSON-serializable by default (only message), but
    // their custom fields should be accessible after the throw.
    const e = new NotConfiguredError("getCircleInfo", "publicClient");
    const snapshot = { name: e.name, operation: e.operation, missing: e.missing };
    assert.deepEqual(snapshot, {
      name: "NotConfiguredError",
      operation: "getCircleInfo",
      missing: "publicClient",
    });
  });

  it("isSdkError narrows every concrete SDK error subclass", () => {
    assert.equal(isSdkError(new CircloSdkError("base")), true);
    assert.equal(isSdkError(new NotConfiguredError("op", "walletClient")), true);
    assert.equal(isSdkError(new EventNotFoundError("Staked", "0x1")), true);
    assert.equal(isSdkError(new TxRevertedError("claim", "0x2")), true);
  });

  it("isSdkError returns false for plain Errors and non-error values", () => {
    assert.equal(isSdkError(new Error("plain")), false);
    assert.equal(isSdkError(new TypeError("type")), false);
    assert.equal(isSdkError("string"), false);
    assert.equal(isSdkError(null), false);
    assert.equal(isSdkError(undefined), false);
    assert.equal(isSdkError({ name: "CircloSdkError", message: "fake" }), false);
  });
});
