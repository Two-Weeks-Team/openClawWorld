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

export const SPRITE_EMOTES = [
  'emote_alert',
  'emote_angry',
  'emote_cash',
  'emote_cross',
  'emote_dots',
  'emote_drop',
  'emote_exclamation',
  'emote_face_angry',
  'emote_face_happy',
  'emote_face_sad',
  'emote_happy',
  'emote_heart',
  'emote_heart_broken',
  'emote_idea',
  'emote_laugh',
  'emote_music',
  'emote_question',
  'emote_sleep',
  'emote_sleeps',
  'emote_star',
  'emote_stars',
  'emote_swirl',
  'emote_skull',
  'emote_thumbsdown',
  'emote_thumbsup',
] as const;

export type SpriteEmoteType = (typeof SPRITE_EMOTES)[number];

export function isValidSpriteEmote(emoteType: string): emoteType is SpriteEmoteType {
  return (SPRITE_EMOTES as readonly string[]).includes(emoteType);
}

export const EMOTE_DISPLAY_DURATION_MS = 2000;
export const EMOTE_FADE_DURATION_MS = 400;
