// Interaction layer for the gallery page only (imported by src/pages/index.astro,
// nowhere else) — card tilt, hover video preview, filter chips, and the
// scroll-reveal IntersectionObserver fallback. Everything here is gated behind
// `prefers-reduced-motion` up front rather than per-effect; if the user asked
// for reduced motion, none of these listeners attach at all.
//
// Astro's ClientRouter keeps the same document/module registry across
// client-side navigations — it does NOT reload the page. Two consequences
// that make top-level side effects the wrong shape here:
//   1. This module's static `import` only ever evaluates once per browser
//      session (ES module singleton semantics) — top-level code here would
//      run on the first visit to "/" and never again, dead on every
//      revisit via the back button or nav link.
//   2. Elements this attaches listeners/observers to get torn down and
//      replaced by fresh ones on every swap; anything not re-queried and
//      re-attached against the *new* DOM silently does nothing.
// So init lives behind `astro:page-load` (fires on the initial load AND
// every subsequent navigation) and everything it attaches is torn down on
// `astro:before-swap` — otherwise every round-trip through "/" would stack
// another full set of IntersectionObservers and listeners.
import { animate } from 'motion/mini';

const HOVER_INTENT_MS = 150;
const MAX_TILT_DEG = 6;

let abortController: AbortController | null = null;
let observers: IntersectionObserver[] = [];
let pendingTimers = new Set<number>();

function initReveal(signal: AbortSignal) {
  const supportsScrollTimeline = CSS.supports('animation-timeline: view()');
  const targets = document.querySelectorAll<HTMLElement>('[data-reveal]');
  const needsObserver = (el: HTMLElement) => !supportsScrollTimeline || el.closest('.rail-item');

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          io.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
  );
  observers.push(io);

  targets.forEach((el) => {
    if (needsObserver(el)) io.observe(el);
  });
  void signal; // nothing here needs abort — IO teardown is via .disconnect() in cleanup()
}

function initTilt(signal: AbortSignal) {
  const cards = document.querySelectorAll<HTMLElement>('[data-tilt-card]');

  cards.forEach((card) => {
    let frame = 0;

    card.addEventListener(
      'pointermove',
      (e) => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          const rect = card.getBoundingClientRect();
          const px = (e.clientX - rect.left) / rect.width;
          const py = (e.clientY - rect.top) / rect.height;
          const rotateY = (px - 0.5) * MAX_TILT_DEG * 2;
          const rotateX = (0.5 - py) * MAX_TILT_DEG * 2;
          animate(
            card,
            { transform: `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)` },
            { duration: 0.2, ease: 'easeOut' },
          );
        });
      },
      { signal },
    );

    card.addEventListener(
      'pointerleave',
      () => {
        if (frame) {
          cancelAnimationFrame(frame);
          frame = 0;
        }
        animate(card, { transform: 'perspective(900px) rotateX(0deg) rotateY(0deg)' }, { duration: 0.4, ease: 'easeOut' });
      },
      { signal },
    );
  });
}

function initVideoPreview(signal: AbortSignal, hoverCapable: boolean) {
  const videos = document.querySelectorAll<HTMLVideoElement>('[data-preview-video]');

  videos.forEach((video) => {
    const card = video.closest<HTMLElement>('[data-tilt-card]');
    if (!card) return;

    const play = () => {
      video.play().then(
        () => video.classList.add('is-active'),
        () => {
          /* Autoplay/permissions rejection — leave the poster showing. */
        },
      );
    };
    const stop = () => {
      video.classList.remove('is-active');
      video.pause();
      video.currentTime = 0;
    };

    if (hoverCapable) {
      let timer = 0;
      card.addEventListener(
        'pointerenter',
        () => {
          timer = window.setTimeout(play, HOVER_INTENT_MS);
          pendingTimers.add(timer);
        },
        { signal },
      );
      card.addEventListener(
        'pointerleave',
        () => {
          window.clearTimeout(timer);
          pendingTimers.delete(timer);
          stop();
        },
        { signal },
      );
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) play();
            else stop();
          }
        },
        { threshold: 0.5 },
      );
      observers.push(io);
      io.observe(card);
    }
  });
}

function initFilters(signal: AbortSignal, reducedMotion: boolean) {
  const chips = document.querySelectorAll<HTMLButtonElement>('[data-filter]');
  const grid = document.querySelector('#project-grid');
  if (!grid || chips.length === 0) return;

  const cards = () => Array.from(grid.querySelectorAll<HTMLElement>('[data-category]'));

  function applyFilter(category: string) {
    const items = cards();
    const before = new Map<HTMLElement, DOMRect>();
    if (!reducedMotion) {
      for (const el of items) {
        if (!el.hidden) before.set(el, el.getBoundingClientRect());
      }
    }

    for (const el of items) {
      el.hidden = category !== 'All' && el.dataset.category !== category;
    }

    if (reducedMotion) return;

    requestAnimationFrame(() => {
      for (const el of items) {
        if (el.hidden) continue;
        const from = before.get(el);
        if (!from) continue; // newly shown — fades in via .is-revealed already, no FLIP needed
        const to = el.getBoundingClientRect();
        const dx = from.left - to.left;
        const dy = from.top - to.top;
        if (dx || dy) {
          animate(
            el,
            { transform: [`translate(${dx}px, ${dy}px)`, 'translate(0px, 0px)'] },
            { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
          );
        }
      }
    });
  }

  chips.forEach((chip) => {
    chip.addEventListener(
      'click',
      () => {
        const category = chip.dataset.filter ?? 'All';
        chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
        applyFilter(category);
      },
      { signal },
    );
  });
}

function init() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  abortController = new AbortController();
  const { signal } = abortController;

  initReveal(signal);
  initFilters(signal, reducedMotion); // functional (show/hide) — runs regardless; only
  // the FLIP animation step inside is gated on reducedMotion.
  if (!reducedMotion) {
    initTilt(signal);
    initVideoPreview(signal, hoverCapable); // hover/loop playback is itself motion — fully
    // skipped under reduced motion, not just muted.
  }
}

function cleanup() {
  abortController?.abort();
  abortController = null;
  observers.forEach((io) => io.disconnect());
  observers = [];
  pendingTimers.forEach((id) => window.clearTimeout(id));
  pendingTimers.clear();
}

document.addEventListener('astro:page-load', init);
document.addEventListener('astro:before-swap', cleanup);
