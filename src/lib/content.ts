import fs from 'node:fs';
import path from 'node:path';
import { PLACEHOLDER } from '../config';

export interface PhotoEntry {
  file: string;
  title?: string;
  year?: number;
  location?: string;
}

export interface ExhibitionGroup {
  decade: string;
  entries: string[];
}

interface RawSection {
  slug: string;
  title: string;
  order: number;
  count?: number;
  period?: string;
  years?: [number, number];
  intro?: string;
  photos?: PhotoEntry[];
  portrait?: string;
  bio?: string[];
  bioNote?: string;
  exhibitions?: ExhibitionGroup[];
}

export interface Frame {
  /** 1-based position in the section, used for "Frame 07 of 24". */
  number: number;
  title: string;
  year: number | null;
  location: string | null;
  /** width / height, drives the grid cell height so rows stay uneven. */
  aspect: number;
  alt: string;
  src: ImageMetadata | null;
}

export interface GallerySection {
  slug: string;
  title: string;
  order: number;
  folder: string;
  href: string;
  intro: string;
  frames: Frame[];
  total: number;
}

export interface AboutSection {
  slug: string;
  title: string;
  order: number;
  folder: string;
  href: string;
  portrait: ImageMetadata | null;
  bio: string[];
  bioNote: string | null;
  exhibitions: ExhibitionGroup[];
}

export interface NavItem {
  title: string;
  href: string;
  slug: string;
}

const CONTENT_DIR = path.join(process.cwd(), 'content');

const images = import.meta.glob<{ default: ImageMetadata }>(
  '/content/**/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG}',
  { eager: true },
);

function resolveImage(folder: string, file: string): ImageMetadata | null {
  const key = `/content/${folder}/${file}`;
  return images[key]?.default ?? null;
}

function readRawSections(): Array<{ folder: string; data: RawSection }> {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  return fs
    .readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const manifest = path.join(CONTENT_DIR, entry.name, 'section.json');
      if (!fs.existsSync(manifest)) return [];

      const data = JSON.parse(fs.readFileSync(manifest, 'utf-8')) as RawSection;
      if (!data.slug || !data.title || typeof data.order !== 'number') {
        throw new Error(`content/${entry.name}/section.json needs slug, title and order.`);
      }
      return [{ folder: entry.name, data }];
    })
    .sort((a, b) => a.data.order - b.data.order);
}

/** Deterministic so a rebuild never reshuffles the frames under Hugh. */
function seeded(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fixed cycle rather than a random draw: no two neighbours share a ratio,
 * including where the cycle wraps, and every section opens on a mixed row.
 */
const ASPECT_CYCLE = [3 / 2, 2 / 3, 1, 4 / 5, 3 / 2, 2 / 3, 3 / 2, 4 / 5, 1, 2 / 3];

const LOCATIONS = [
  'New York',
  'Philadelphia',
  'Baltimore',
  'Pittsburgh',
  'Washington, DC',
  'Asbury Park, NJ',
  'Cape May, NJ',
  'Provincetown, MA',
  'Charleston, SC',
  'New Orleans',
  'Chicago',
  'Detroit',
  'Santa Fe, NM',
  'Rural Pennsylvania',
  'Boston',
];

function href(slug: string): string {
  if (slug === 'selected-work') return '/';
  return `/${slug}`;
}

function placeholderIntro(data: RawSection, folder: string): string {
  const count = data.count ?? 24;
  const period = data.period ? ` ${data.period}` : '';
  return `This section holds up to ${count} photographs${period}. Put those files in the folder \`${folder}\`.`;
}

function buildPlaceholderFrames(data: RawSection): Frame[] {
  const count = data.count ?? 24;
  const [from, to] = data.years ?? [1963, 2024];
  const random = seeded(data.slug);

  return Array.from({ length: count }, (_, i) => {
    const aspect = ASPECT_CYCLE[i % ASPECT_CYCLE.length] as number;
    const year = from + Math.floor(random() * (to - from + 1));
    const location = LOCATIONS[Math.floor(random() * LOCATIONS.length)] as string;

    return {
      number: i + 1,
      title: 'Untitled',
      year,
      location,
      aspect,
      alt: `Placeholder frame ${i + 1} of ${count}`,
      src: null,
    };
  });
}

function photoFrame(photo: PhotoEntry, src: ImageMetadata, number: number): Frame {
  const title = photo.title ?? 'Untitled';
  const year = photo.year ?? null;
  const location = photo.location ?? null;

  return {
    number,
    title,
    year,
    location,
    aspect: src.width / src.height,
    alt: [title, year, location].filter(Boolean).join(', '),
    src,
  };
}

function buildRealFrames(data: RawSection, folder: string): Frame[] {
  const photos = data.photos ?? [];

  return photos.map((photo, i) => {
    const src = resolveImage(folder, photo.file);
    if (!src) {
      throw new Error(`content/${folder}/${photo.file} is listed in section.json but missing on disk.`);
    }
    return photoFrame(photo, src, i + 1);
  });
}

/**
 * Keep the full grey-frame count, but swap in any real files listed in photos[].
 * Extra listings beyond the section's slot count are ignored.
 */
function overlayPreviewFrames(data: RawSection, folder: string): Frame[] {
  const frames = buildPlaceholderFrames(data);
  const photos = data.photos ?? [];

  photos.slice(0, frames.length).forEach((photo, i) => {
    const src = resolveImage(folder, photo.file);
    if (!src) {
      throw new Error(`content/${folder}/${photo.file} is listed in section.json but missing on disk.`);
    }
    const overlaid = photoFrame(photo, src, i + 1);
    frames[i] = overlaid;
  });

  return frames;
}

export function getGallerySections(): GallerySection[] {
  return readRawSections()
    .filter(({ data }) => !data.bio)
    .flatMap(({ folder, data }) => {
      const frames = PLACEHOLDER
        ? overlayPreviewFrames(data, folder)
        : buildRealFrames(data, folder);
      // A section with no photographs yet stays out of the site entirely.
      if (!PLACEHOLDER && frames.length === 0) return [];

      return [
        {
          slug: data.slug,
          title: data.title,
          order: data.order,
          folder,
          href: href(data.slug),
          intro: PLACEHOLDER ? placeholderIntro(data, folder) : (data.intro ?? ''),
          frames,
          total: frames.length,
        },
      ];
    });
}

export function getAbout(): AboutSection {
  const entry = readRawSections().find(({ data }) => Boolean(data.bio));
  if (!entry) throw new Error('content/06-about/section.json is missing.');

  const { folder, data } = entry;
  const portrait = data.portrait ? resolveImage(folder, data.portrait) : null;

  return {
    slug: data.slug,
    title: data.title,
    order: data.order,
    folder,
    href: '/about',
    portrait,
    bio: data.bio ?? [],
    bioNote: PLACEHOLDER ? (data.bioNote ?? null) : null,
    exhibitions: data.exhibitions ?? [],
  };
}

export function getNav(): NavItem[] {
  const sections = getGallerySections().map(({ title, href: to, slug }) => ({ title, href: to, slug }));
  const about = getAbout();
  return [...sections, { title: about.title, href: about.href, slug: about.slug }];
}

export function frameCountSummary(): string {
  return getGallerySections()
    .map((section) => `${section.title} ${section.total}`)
    .join(' · ');
}
