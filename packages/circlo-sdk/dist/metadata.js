/**
 * Pure helpers that build the metadataURI JSON written to the contract.
 * Extracted from createCircle / createGoal so they can be unit-tested
 * without spinning up a real wallet or chain.
 */
export function buildCircleMetadata(input) {
    return JSON.stringify({
        name: input.name,
        ...(input.description && { description: input.description }),
        ...(input.category && { category: input.category }),
        avatarEmoji: input.avatarEmoji ?? "🎯",
        ...(input.avatarColor && { avatarColor: input.avatarColor }),
        ...input.extra,
    });
}
export function buildGoalMetadata(input) {
    return JSON.stringify({
        question: input.question,
        ...(input.description && { description: input.description }),
        ...(input.category && { category: input.category }),
        ...(input.emoji && { emoji: input.emoji }),
        ...input.extra,
    });
}
//# sourceMappingURL=metadata.js.map