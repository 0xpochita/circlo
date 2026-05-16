import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { buildCircleMetadata, buildGoalMetadata } from "../dist/index.js";

describe("buildCircleMetadata", () => {
  it("includes name and defaults the avatarEmoji to 🎯", () => {
    const json = buildCircleMetadata({ name: "Gym Squad", privacy: "public" });
    const parsed = JSON.parse(json);
    assert.equal(parsed.name, "Gym Squad");
    assert.equal(parsed.avatarEmoji, "🎯");
  });

  it("omits empty optional fields rather than emitting null/undefined", () => {
    const json = buildCircleMetadata({ name: "Gym Squad", privacy: "public" });
    const parsed = JSON.parse(json);
    assert.equal("description" in parsed, false);
    assert.equal("category" in parsed, false);
    assert.equal("avatarColor" in parsed, false);
  });

  it("includes provided optional fields verbatim", () => {
    const json = buildCircleMetadata({
      name: "Gym Squad",
      privacy: "public",
      description: "Stay accountable",
      category: "fitness",
      avatarEmoji: "💪",
      avatarColor: "#ef4444",
    });
    const parsed = JSON.parse(json);
    assert.equal(parsed.description, "Stay accountable");
    assert.equal(parsed.category, "fitness");
    assert.equal(parsed.avatarEmoji, "💪");
    assert.equal(parsed.avatarColor, "#ef4444");
  });

  it("merges extra fields without clobbering known fields", () => {
    const json = buildCircleMetadata({
      name: "Gym Squad",
      privacy: "public",
      extra: { vibe: "wholesome", maxMembers: 12 },
    });
    const parsed = JSON.parse(json);
    assert.equal(parsed.name, "Gym Squad");
    assert.equal(parsed.vibe, "wholesome");
    assert.equal(parsed.maxMembers, 12);
  });
});

describe("buildGoalMetadata", () => {
  it("includes question and omits unspecified optional fields", () => {
    const json = buildGoalMetadata({ question: "Will it rain today?" });
    const parsed = JSON.parse(json);
    assert.equal(parsed.question, "Will it rain today?");
    assert.equal("description" in parsed, false);
    assert.equal("category" in parsed, false);
    assert.equal("emoji" in parsed, false);
  });

  it("includes provided optional fields verbatim", () => {
    const json = buildGoalMetadata({
      question: "Will it rain today?",
      description: "Within 24h",
      category: "weather",
      emoji: "☔",
    });
    const parsed = JSON.parse(json);
    assert.equal(parsed.description, "Within 24h");
    assert.equal(parsed.category, "weather");
    assert.equal(parsed.emoji, "☔");
  });
});
