/**
 * Pure helpers that build the metadataURI JSON written to the contract.
 * Extracted from createCircle / createGoal so they can be unit-tested
 * without spinning up a real wallet or chain.
 */

export type CircleMetadataInput = {
  name: string;
  description?: string;
  privacy?: "public" | "private";
  category?: string;
  avatarEmoji?: string;
  avatarColor?: string;
  extra?: Record<string, unknown>;
};

/**
 * Build the `metadataURI` JSON payload for a circle.
 *
 * Field order in the output is fixed: `name`, `description` (if set),
 * `category` (if set), `avatarEmoji`, `avatarColor` (if set), then any
 * `extra` keys. Empty optional fields are omitted entirely — they
 * don't write `undefined` or `null` to the chain.
 *
 * The result is JSON-stringified bytes — pass directly to the
 * `CircleFactory.createCircle` `metadataURI` argument. No off-chain
 * upload step needed.
 *
 * `avatarEmoji` defaults to `🎯` so circles without an explicit emoji
 * still render a recognizable badge in the UI.
 *
 * @example
 * ```ts
 * const uri = buildCircleMetadata({
 *   name: "Gym Squad",
 *   privacy: "public",
 *   avatarEmoji: "💪",
 *   category: "fitness",
 * });
 * // => '{"name":"Gym Squad","category":"fitness","avatarEmoji":"💪"}'
 * ```
 */
export function buildCircleMetadata(input: CircleMetadataInput): string {
  return JSON.stringify({
    name: input.name,
    ...(input.description && { description: input.description }),
    ...(input.category && { category: input.category }),
    avatarEmoji: input.avatarEmoji ?? "🎯",
    ...(input.avatarColor && { avatarColor: input.avatarColor }),
    ...input.extra,
  });
}

export type GoalMetadataInput = {
  question: string;
  description?: string;
  category?: string;
  emoji?: string;
  extra?: Record<string, unknown>;
};

export function buildGoalMetadata(input: GoalMetadataInput): string {
  return JSON.stringify({
    question: input.question,
    ...(input.description && { description: input.description }),
    ...(input.category && { category: input.category }),
    ...(input.emoji && { emoji: input.emoji }),
    ...input.extra,
  });
}
