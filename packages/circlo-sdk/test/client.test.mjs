import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { createCircloClient } from "../dist/index.js";

describe("createCircloClient", () => {
  it("returns the deployed Circlo contract addresses on Celo Mainnet", () => {
    const client = createCircloClient();
    assert.equal(client.chainId, 42220);
    assert.equal(client.contracts.CircleFactory, "0x6cB74ce06E35caEfaFA1491769DeeeA46aebe6Ab");
    assert.equal(client.contracts.PredictionPool, "0xE9cFa67358476194414ae3306888FfeCb8f41139");
    assert.equal(client.contracts.ResolutionModule, "0x5861CAAFDCAc4313f2c9941C4fd1291B34C2c4f5");
    assert.equal(client.contracts.USDT, "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e");
  });

  it("throws a friendly error when a write method is called without a walletClient", async () => {
    const client = createCircloClient();
    await assert.rejects(
      () => client.createCircle({ name: "Gym Squad", privacy: "public" }),
      /createCircle: CircloClient was created without a walletClient/,
    );
  });

  it("throws a friendly error when a read method is called without a publicClient", async () => {
    const client = createCircloClient();
    await assert.rejects(
      () => client.isCircleMember(1n, "0x0000000000000000000000000000000000000000"),
      /isCircleMember: CircloClient was created without a publicClient/,
    );
  });

  it("exposes the walletClient and publicClient passed in via config", () => {
    const fakeWallet = { account: { address: "0xabc" } };
    const fakePublic = { transport: {} };
    const client = createCircloClient({
      walletClient: fakeWallet,
      publicClient: fakePublic,
    });
    assert.equal(client.walletClient, fakeWallet);
    assert.equal(client.publicClient, fakePublic);
  });
});
