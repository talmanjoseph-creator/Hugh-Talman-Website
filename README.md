# hughtalman.com

A static portfolio site for the photographs of Hugh Talman. Built with Astro; the only
JavaScript on the page is a lazy-loaded React lightbox.

**This build is a placeholder.** There are no photographs in it yet. Every grey rectangle
marks a slot where a photograph will go, and each section page names the folder its photos
should be dropped into. That is the whole point of this version: Hugh can see the finished
structure and sort his archive to match it.

## Run it locally

Requires Node 22 or newer (`nvm use` picks it up from `.nvmrc`).

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static output into dist/
npm run preview  # serve the built site
```

## How the content works

Everything the site shows comes from `content/`. One folder per section, each with a
`section.json` beside its image files:

```
content/
  01-selected-work/section.json
  02-1960s-70s/section.json
  03-1980s-90s/section.json
  04-2000s-now/section.json
  05-series/section.json
  06-about/section.json
```

The number prefix controls nothing on its own — `order` inside each `section.json` does the
sorting, and `slug` becomes the URL. A gallery `section.json` looks like this:

```json
{
  "slug": "1960s-70s",
  "title": "1960s–70s",
  "order": 2,
  "count": 24,
  "period": "from the 1960s and 70s",
  "years": [1963, 1979],
  "intro": "",
  "photos": [
    { "file": "hugh-1968-01.jpg", "title": "Untitled", "year": 1968, "location": "New York" }
  ]
}
```

- `count`, `period` and `years` are only used while the site is in placeholder mode: they
  decide how many grey frames appear, what the orientation sentence reads like, and which
  years the stand-in captions show.
- `photos` is the real edit — order in this array is the order on the page.
- `intro` is an optional one-line note under the section title, used once placeholder mode
  is off.

### Adding a section

Make a folder under `content/`, add a `section.json` with a new `slug`, `title` and `order`,
and drop the images in beside it. The navigation, the route, and the sitemap all pick it up
on the next build; nothing is hardcoded. A section with an empty `photos` array is skipped
entirely once placeholder mode is off.

## Turning off placeholder mode

Open [`src/config.ts`](src/config.ts) and change one line:

```ts
export const PLACEHOLDER = false;
```

That single flag:

- stops generating grey frames and uses the files listed in each `photos` array
- drops the "Frame 07 of 24" line from every caption
- removes the orientation banner at the top of the page
- removes the "put those files in the folder ..." intro from each section
- shows the real portrait on the About page instead of the grey 4:5 block

If a file is listed in `section.json` but missing from the folder, the build fails with the
path that is missing rather than shipping a hole in the grid.

## Deploying to Cloudflare Pages

The site is fully static, so Pages needs no adapter and no `wrangler.toml`.

1. Push the repository to GitHub and connect it in the Cloudflare dashboard under
   Workers & Pages > Create > Pages.
2. Build command: `npm run build`
3. Build output directory: `dist`
4. Environment variable: `NODE_VERSION` = `22`

Every push to `main` rebuilds and deploys. Adding photographs is therefore a matter of
committing image files and editing `section.json` — no CMS, no admin login.

## Other notes

- `public/og.png` is the social sharing card, committed as a static file. Regenerate it with
  `node scripts/make-og.mjs` if the wordmark ever changes.
- The lightbox is the only React on the site and loads only when the gallery scrolls into
  view. With JavaScript disabled the grid and all captions still work.
