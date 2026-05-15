/**
 * Re-export viem-compatible address type without taking a hard dependency on viem.
 * Users who have viem installed will get the same shape; users without it get
 * a plain template-literal string.
 */

export type Address = `0x${string}`;

/**
 * Parse a Circle metadataURI string (the JSON blob passed to createCircle).
 * Returns null on parse failure.
 */
export function parseCircleMetadata(uri: string): {
  name: string;
  description: string;
  category: string;
  avatarEmoji: string;
  avatarColor: string;
} | null {
  try {
    const parsed = JSON.parse(uri);
    return {
      name: typeof parsed.name === "string" ? parsed.name : "Circle",
      description: typeof parsed.description === "string" ? parsed.description : "",
      category: typeof parsed.category === "string" ? parsed.category : "general",
      avatarEmoji: typeof parsed.avatarEmoji === "string" ? parsed.avatarEmoji : "✨",
      avatarColor: typeof parsed.avatarColor === "string" ? parsed.avatarColor : "#fbbf24",
    };
  } catch {
    return null;
  }
}

/**
 * Parse a Goal metadataURI string (the JSON blob passed to createGoal).
 * Returns null on parse failure.
 */
export function parseGoalMetadata(uri: string): {
  title: string;
  description: string;
  avatar: string;
} | null {
  try {
    const parsed = JSON.parse(uri);
    return {
      title: typeof parsed.title === "string" ? parsed.title : "Goal",
      description: typeof parsed.description === "string" ? parsed.description : "",
      avatar: typeof parsed.avatar === "string" ? parsed.avatar : "🎯|#ec4899",
    };
  } catch {
    return null;
  }
}
