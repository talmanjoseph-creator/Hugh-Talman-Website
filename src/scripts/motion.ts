import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const LIGHTBOX_OPEN = 'yarl__no_scroll';
const EASE = 'power3.out';
const FIRST_LEAD = 0.08;
const NAV_LEAD = 0.34;

let lenis: Lenis | null = null;
let tick: ((time: number) => void) | null = null;
let triggers: ScrollTrigger[] = [];
let tweens: gsap.core.Tween[] = [];
let lightboxObserver: MutationObserver | null = null;
let detachRefresh: Array<() => void> = [];
let generation = 0;
let visits = 0;
let lead = FIRST_LEAD;
let leadUntil = 0;
let lockedScroll: number | null = null;
const revealed = new WeakSet<Element>();

function prefersReducedMotion() {
  return window.matchMedia(MOTION_QUERY).matches;
}

function markMotion(doc: Document) {
  doc.documentElement.classList.toggle('motion', !prefersReducedMotion());
}

function track(tween: gsap.core.Tween) {
  tweens.push(tween);
  return tween;
}

function leadIn() {
  return performance.now() < leadUntil ? lead : 0;
}

function unseen(batch: Element[]) {
  return batch.filter((node) => {
    if (revealed.has(node)) return false;
    revealed.add(node);
    return true;
  });
}

function revealFrames(batch: Element[]) {
  const items = unseen(batch);
  if (!items.length) return;

  const base = leadIn();
  items.forEach((node, index) => {
    if (!(node instanceof HTMLElement)) return;
    const delay = base + index * 0.085;

    track(
      gsap.fromTo(
        node,
        { y: 22, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.15, delay, ease: EASE, overwrite: 'auto' },
      ),
    );

    const frame = node.classList.contains('motion-frame')
      ? node
      : node.querySelector<HTMLElement>('.frame');
    if (!frame) return;

    track(
      gsap.fromTo(
        frame,
        { clipPath: 'inset(5% 0% 5% 0%)' },
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 1.3,
          delay,
          ease: EASE,
          overwrite: 'auto',
        },
      ),
    );

    const image = frame.querySelector<HTMLElement>('img');
    track(
      gsap.fromTo(
        image ?? frame,
        { scale: image ? 1.045 : 1.03 },
        {
          scale: 1,
          duration: 1.45,
          delay,
          ease: EASE,
          overwrite: 'auto',
          transformOrigin: '50% 50%',
        },
      ),
    );
  });
}

function revealBlocks(batch: Element[]) {
  const items = unseen(batch);
  if (!items.length) return;

  track(
    gsap.fromTo(
      items,
      { y: 16, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1.05,
        delay: leadIn(),
        stagger: 0.07,
        ease: EASE,
        overwrite: 'auto',
      },
    ),
  );
}

function mountReveals() {
  const figures = gsap.utils.toArray<HTMLElement>('.figure');
  const portraits = gsap.utils.toArray<HTMLElement>('.motion-frame');
  const blocks = gsap.utils.toArray<HTMLElement>('.motion-block');
  const batch = {
    start: 'top 87%',
    once: true,
    interval: 0.08,
  } as const;

  if (figures.length) {
    triggers.push(...ScrollTrigger.batch(figures, { ...batch, onEnter: revealFrames }));
  }
  if (portraits.length) {
    triggers.push(...ScrollTrigger.batch(portraits, { ...batch, onEnter: revealFrames }));
  }
  if (blocks.length) {
    triggers.push(...ScrollTrigger.batch(blocks, { ...batch, onEnter: revealBlocks }));
  }
}

function syncLightbox() {
  if (!lenis) return;
  const open = document.body.classList.contains(LIGHTBOX_OPEN);

  if (open && !lenis.isStopped) {
    lockedScroll = window.scrollY;
    lenis.stop();
    if (window.scrollY !== lockedScroll) {
      window.scrollTo({ top: lockedScroll, behavior: 'instant' });
    }
    return;
  }

  if (!open && lenis.isStopped) {
    const y = lockedScroll;
    lockedScroll = null;
    lenis.start();
    if (y !== null) lenis.scrollTo(y, { immediate: true, force: true });
  }
}

function mountLightboxLock() {
  syncLightbox();
  lightboxObserver = new MutationObserver(syncLightbox);
  lightboxObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
}

function mountImageRefresh(gen: number) {
  let queued = false;
  const refresh = () => {
    if (gen !== generation || queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      if (gen === generation) ScrollTrigger.refresh();
    });
  };

  document.querySelectorAll<HTMLImageElement>('#main img').forEach((img) => {
    if (img.complete) return;
    img.addEventListener('load', refresh);
    detachRefresh.push(() => img.removeEventListener('load', refresh));
  });

  void document.fonts?.ready.then(() => {
    if (gen === generation) ScrollTrigger.refresh();
  });
}

function teardown() {
  generation += 1;
  lightboxObserver?.disconnect();
  lightboxObserver = null;
  for (const off of detachRefresh) off();
  detachRefresh = [];
  for (const tween of tweens) tween.kill();
  tweens = [];
  for (const trigger of triggers) trigger.kill(false);
  triggers = [];
  if (tick) {
    gsap.ticker.remove(tick);
    tick = null;
  }
  lenis?.destroy();
  lenis = null;
  lockedScroll = null;
  gsap.ticker.lagSmoothing(500, 33);
}

function clearPinnedStyles() {
  gsap.set('.figure, .motion-block, .motion-frame, .frame, .figure img, .motion-frame img', {
    clearProps: 'opacity,transform,clipPath,visibility',
  });
}

function setup() {
  teardown();
  if (prefersReducedMotion()) {
    document.documentElement.classList.remove('motion');
    clearPinnedStyles();
    return;
  }

  const gen = generation;
  document.documentElement.classList.add('motion');
  visits += 1;
  lead = visits === 1 ? FIRST_LEAD : NAV_LEAD;
  leadUntil = performance.now() + 500;

  try {
    lenis = new Lenis({
      autoRaf: false,
      lerp: 0.08,
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 0.95,
      stopInertiaOnNavigate: true,
      prevent: (node) => Boolean(node.closest('.yarl__portal')),
    });

    lenis.on('scroll', ScrollTrigger.update);
    tick = (time) => {
      lenis?.raf(time * 1000);
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    mountLightboxLock();
    mountReveals();
    mountImageRefresh(gen);
  } catch (error) {
    teardown();
    document.documentElement.classList.remove('motion');
    clearPinnedStyles();
    console.error(error);
  }
}

function onBeforeSwap(event: Event) {
  const next = (event as Event & { newDocument?: Document }).newDocument;
  if (next) markMotion(next);
  teardown();
}

export function initMotion() {
  if (window.__htMotion) return;
  window.__htMotion = true;

  // The first `astro:page-load` waits for the window load event, which waits
  // for every image. Start the first visit as soon as the document is parsed
  // so the gallery does not sit invisible until then, and ignore that one
  // follow-up event so the reveal does not restart.
  let skipNextPageLoad = false;

  markMotion(document);
  document.addEventListener('astro:page-load', () => {
    if (skipNextPageLoad) {
      skipNextPageLoad = false;
      return;
    }
    setup();
  });
  document.addEventListener('astro:before-swap', onBeforeSwap);
  window.matchMedia(MOTION_QUERY).addEventListener('change', () => {
    if (prefersReducedMotion()) {
      teardown();
      document.documentElement.classList.remove('motion');
      clearPinnedStyles();
      return;
    }
    setup();
  });

  if (document.readyState === 'complete') setup();
  else if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        skipNextPageLoad = true;
        setup();
      },
      { once: true },
    );
  } else {
    skipNextPageLoad = true;
    setup();
  }
}

declare global {
  interface Window {
    __htMotion?: boolean;
  }
}
