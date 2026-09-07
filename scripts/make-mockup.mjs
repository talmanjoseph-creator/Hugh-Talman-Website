// Builds a shareable PDF mockup from the built site in dist/.
//   npm run build && node scripts/make-mockup.mjs
// Needs a Chrome binary; pass one with CHROME_PATH if the default is missing.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = path.join(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const out = path.join(root, 'hughtalman-mockup.pdf');
// Outside dist so the working file is never deployed.
const combined = path.join(tmpdir(), 'hughtalman-mockup.html');

const PAGES = [
  'index.html',
  '1960s-70s/index.html',
  '1980s-90s/index.html',
  '2000s-now/index.html',
  'series/index.html',
  'about/index.html',
];

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
].filter(Boolean);

function chrome() {
  const found = CHROME_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!found) throw new Error('No Chrome binary found. Set CHROME_PATH.');
  return found;
}

function readPage(file) {
  const html = readFileSync(path.join(dist, file), 'utf-8');
  const body = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));
  return body
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<a class="skip-link"[\s\S]*?<\/a>/, '')
    .replace(/<div class="banner"[\s\S]*?<\/div><\/div>/, '');
}

function siteStyles() {
  const html = readFileSync(path.join(dist, 'index.html'), 'utf-8');
  return [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
}

function sections() {
  const dir = path.join(root, 'content');
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      folder: entry.name,
      data: JSON.parse(readFileSync(path.join(dir, entry.name, 'section.json'), 'utf-8')),
    }))
    .filter(({ data }) => !data.bio)
    .sort((a, b) => a.data.order - b.data.order);
}

const printCss = `
  @page { size: 1440px 1000px; margin: 0; }
  html, body { background: #fff; }
  body { animation: none; font-size: 18px; }
  /* Print does not evaluate the desktop media query, so restate that layout here. */
  .shell { display: grid; grid-template-columns: 220px 1fr; column-gap: 64px; padding-top: 56px; }
  .masthead { position: static !important; margin-bottom: 0; }
  .nav__list { display: block; overflow: visible; padding-bottom: 0; border-bottom: 0; }
  .nav__list li + li { margin-top: 10px; }
  .nav__link[aria-current="page"] { border-bottom: 0; padding-bottom: 0; }
  /* Chrome fragments CSS grid poorly across print pages; flex wraps cleanly. */
  .gallery { display: flex !important; flex-wrap: wrap; gap: 40px 28px; }
  .gallery > li { width: calc((100% - 56px) / 3); }
  .about { display: flex !important; gap: 64px; align-items: flex-start; }
  .about > div:first-child { width: 38%; flex: none; }
  .about__body { flex: 1; }
  .figure, .timeline__group { break-inside: avoid; }
  .site-page { break-after: page; }
  .site-page:last-child { break-after: auto; }
  .cover { padding: 120px var(--gutter) 0; max-width: 1000px; }
  .cover h1 {
    font-family: var(--font-body); font-size: 13px; font-weight: 500;
    letter-spacing: 0.18em; text-transform: uppercase; margin: 0 0 64px;
  }
  .cover h2 {
    font-family: var(--font-display); font-weight: 400; font-size: 72px;
    line-height: 1; margin: 0 0 32px;
  }
  .cover p { max-width: 62ch; margin: 0 0 20px; }
  .cover .meta { font-family: var(--font-meta); font-size: 12px; color: var(--ink-soft); }
  .cover table { border-collapse: collapse; margin: 8px 0 32px; }
  .cover td {
    font-family: var(--font-meta); font-size: 12px; color: var(--ink-soft);
    padding: 6px 32px 6px 0; border-bottom: 1px solid var(--rule); vertical-align: top;
  }
  .cover td:first-child { color: var(--ink); }
`;

const rows = sections()
  .map(
    ({ folder, data }) =>
      `<tr><td>${folder}</td><td>${data.title}</td><td>up to ${data.count} photographs</td></tr>`,
  )
  .join('');

const today = new Date().toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const cover = `
<div class="site-page cover">
  <h1>Hugh Talman</h1>
  <h2>A first look at the website</h2>
  <p>This is a preview of the finished structure of hughtalman.com. There are no photographs
  in it yet. Every grey rectangle marks a slot where one of your photographs will go, so you
  can see the shape of the site before choosing what fills it.</p>
  <p>Each section of the site is one folder. To fill the site, sort your photographs into
  folders with these names:</p>
  <table><tbody>${rows}</tbody></table>
  <p>Captions currently read "Untitled" with a stand-in year and place. The real titles, years
  and locations will come from you, and can be different for every photograph. Nothing here is
  final: the number of photographs per section, the order they appear in, and the words on the
  About page can all change.</p>
  <p class="meta">Placeholder mockup · ${today}</p>
</div>`;

const body = PAGES.map((file) => `<div class="site-page">${readPage(file)}</div>`).join('\n');

writeFileSync(
  combined,
  `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Hugh Talman — placeholder mockup</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400&family=Inter:wght@400;500&family=IBM+Plex+Mono:wght@400&display=swap">
<style>${siteStyles()}</style><style>${printCss}</style>
</head><body>${cover}${body}</body></html>`,
);

execFileSync(
  chrome(),
  [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--no-pdf-header-footer',
    '--virtual-time-budget=10000',
    `--print-to-pdf=${out}`,
    `file://${combined}`,
  ],
  { stdio: 'inherit' },
);

console.log(`wrote ${path.relative(root, out)}`);
