export const EMOTES = {
  ':thumbsup:': '👍',
  ':thumbsdown:': '👎',
  ':heart:': '❤️',
  ':laugh:': '😂',
  ':think:': '🤔',
  ':fire:': '🔥',
  ':clap:': '👏',
  ':wave:': '👋',
} as const;

export type EmoteCode = keyof typeof EMOTES;

const EMOTE_REGEX = /:[a-z]+:/g;

export function parseEmotes(message: string): string[] {
  const matches = message.match(EMOTE_REGEX);
  if (!matches) return [];

  return matches.filter((code): code is EmoteCode => code in EMOTES);
}

export function replaceEmotes(message: string): string {
  return message.replace(EMOTE_REGEX, code => {
    return EMOTES[code as EmoteCode] || code;
  });
}
