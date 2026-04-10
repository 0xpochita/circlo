export const EMOJI_OPTIONS = [
  "🔗", "💰", "💳", "💎", "💖", "💙", "🎁", "⭐",
  "☕", "🍕", "🍺", "🎂", "🚀", "👑", "✨", "🎯",
  "👨‍💻", "💻", "🎨", "🎧", "🎤", "📸", "🎮", "👻",
  "🌟", "🔥", "💡", "🎉", "🌈", "🦄", "🐼", "🦁",
  "🐶", "🐱", "🌺", "🌸", "🍀", "⚡", "💫", "🏆",
];

export const COLOR_OPTIONS = [
  "#1a1a1a",
  "#60a5fa",
  "#a78bfa",
  "#ec4899",
  "#34d399",
  "#fbbf24",
  "#f87171",
  "#fb923c",
  "#2dd4bf",
  "#16a34a",
];

export function getRandomAvatar() {
  const emoji = EMOJI_OPTIONS[Math.floor(Math.random() * EMOJI_OPTIONS.length)];
  const color = COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)];
  return { emoji, color };
}
