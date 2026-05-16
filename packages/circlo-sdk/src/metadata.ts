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
