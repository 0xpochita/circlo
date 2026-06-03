/**
 * Re-export viem-compatible address type without taking a hard dependency on viem.
 * Users who have viem installed will get the same shape; users without it get
 * a plain template-literal string.
 */

export type Address = `0x${string}`;

/**
 * Parse a Circle `metadataURI` string back into its structured fields.
 *
 * The input is the raw JSON blob that was passed to `createCircle` —
 * indexers + frontends get it via `getCircle(id).metadataURI` or the
 * `CircleCreated` event. This function tolerates malformed/missing
 * fields by substituting safe defaults:
 *
 *   - `name`        → `"Circle"`
 *   - `description` → `""`
 *   - `category`    → `"general"`
 *   - `avatarEmoji` → `"✨"`
 *   - `avatarColor` → `"#fbbf24"`
 *
 * Returns `null` only if `uri` is not parseable as JSON at all — every
 * other case returns the fallback-filled object so renderers don't
 * have to null-check field by field.
 *
 * Pair with `buildCircleMetadata` in `circlo-sdk` for the round-trip.
 *
 * @example
 * ```ts
 * const info = await client.getCircleInfo(42n);
 * const meta = parseCircleMetadata(info.metadataURI);
 * if (meta) console.log(meta.name, meta.avatarEmoji);
 * ```
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
 * Parse a Goal `metadataURI` string back into its structured fields.
 *
 * Same null-tolerance contract as `parseCircleMetadata` — every field
 * gets a default if missing, and the function only returns `null` on
 * outright unparseable JSON. Defaults:
 *
 *   - `title`       → `"Goal"`
 *   - `description` → `""`
 *   - `avatar`      → `"🎯|#ec4899"` (emoji + bg color, pipe-delimited)
 *
 * `avatar` is a `"emoji|#hex"` compound — `parseAvatar` (in the
 * frontend utils) splits it. Goal cards render the emoji in front of
 * a circle filled with the color.
 *
 * @example
 * ```ts
 * const meta = parseGoalMetadata(goal.metadataURI);
 * if (meta) renderGoalCard(meta.title, meta.avatar);
 * ```
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
