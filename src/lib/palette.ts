// Small touches of colour across the site come from one palette of real project accents
// (the --c-* tokens in src/styles/global.css). This file says which colour goes where.

export const palette = {
  yellow: 'var(--c-yellow)',
  cyan: 'var(--c-cyan)',
  violet: 'var(--c-violet)',
  red: 'var(--c-red)',
  pink: 'var(--c-pink)',
  orange: 'var(--c-orange)',
  green: 'var(--c-green)',
} as const;

/** The colour of each project tag (filters on /work, the dot in a project card's category). */
export const tagTint: Record<string, string> = {
  Design: palette.yellow,
  Branding: palette.cyan,
  'UI/UX': palette.violet,
  Print: palette.pink,
  Animation: palette.orange,
  AI: palette.green,
};

export const tintOf = (tag: string | undefined) => (tag && tagTint[tag]) || palette.yellow;
