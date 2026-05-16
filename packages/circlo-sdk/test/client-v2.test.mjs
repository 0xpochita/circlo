import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { createCircloClient } from "../dist/index.js";

describe("CircloClient v0.2 new methods", () => {
  it("read-only client exposes the new read methods on its surface", () => {
    const client = createCircloClient();
    // Method existence — type-level checks aren't enough at runtime, so
    // assert these are actual functions.
    assert.equal(typeof client.getCircleNextId, "function");
    assert.equal(typeof client.getGoalNextId, "function");
    assert.equal(typeof client.getCircleInfo, "function");
    assert.equal(typeof client.getTally, "function");
    assert.equal(typeof client.submitVote, "function");
    assert.equal(typeof client.finalize, "function");
  });

  it("submitVote rejects without a walletClient", async () => {
    const client = createCircloClient();
    await assert.rejects(
      () => client.submitVote(1n, 1),
      /submitVote: CircloClient was created without a walletClient/,
    );
  });

  it("getTally rejects without a publicClient", async () => {
    const client = createCircloClient();
    await assert.rejects(
      () => client.getTally(1n),
      /getTally: CircloClient was created without a publicClient/,
    );
  });

  it("getCircleNextId rejects without a publicClient", async () => {
    const client = createCircloClient();
    await assert.rejects(
      () => client.getCircleNextId(),
      /getCircleNextId/,
    );
  });
});
