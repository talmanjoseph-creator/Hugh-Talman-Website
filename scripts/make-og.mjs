// Renders the static Open Graph card once. Re-run with `node scripts/make-og.mjs`
// only if the wordmark or paper color changes; the PNG is committed.
import { writeFileSync } from 'node:fs';
import sharp from 'sharp';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#FBFAF7"/>
  <rect x="80" y="80" width="1040" height="1" fill="#E4E2DC"/>
  <rect x="80" y="549" width="1040" height="1" fill="#E4E2DC"/>
  <text x="80" y="336" font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
        font-size="46" font-weight="500" letter-spacing="8.3" fill="#171717">HUGH TALMAN</text>
  <text x="80" y="392" font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
        font-size="26" fill="#5A5A57">Photographs, 1960s to now</text>
</svg>`;

const png = await sharp(Buffer.from(svg)).png().toBuffer();
writeFileSync(new URL('../public/og.png', import.meta.url), png);
console.log('wrote public/og.png');
