/**
 * Flip PLACEHOLDER to false once real photographs are in the content folders.
 * Nothing else needs to change: the loader switches from generated grey frames
 * to the files listed in each section.json, and the "Frame 07 of 24" caption
 * line and the orientation banner disappear on their own.
 */
export const PLACEHOLDER = true;

export const SITE = {
  url: 'https://hughtalman.com',
  name: 'Hugh Talman',
  wordmark: 'HUGH TALMAN',
  description: 'Photographs by Hugh Talman, made from the 1960s to now.',
} as const;

export const CONTACT_EMAIL = 'talhuman@msn.com';
