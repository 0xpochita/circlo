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
export declare function buildCircleMetadata(input: CircleMetadataInput): string;
export type GoalMetadataInput = {
    question: string;
    description?: string;
    category?: string;
    emoji?: string;
    extra?: Record<string, unknown>;
};
export declare function buildGoalMetadata(input: GoalMetadataInput): string;
//# sourceMappingURL=metadata.d.ts.map