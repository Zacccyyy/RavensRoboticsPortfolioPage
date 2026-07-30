// Subtle parallax on the blueprint grid, tied to mouse position — desktop
// pointer only, rAF-throttled (a raw mousemove listener fires far more
// often than the display can paint; this coalesces to one write per
// frame).
//
// Lives in public/, referenced from BaseLayout.astro as
// `<script src="/scripts/parallax.js" is:inline></script>` rather than a
// project-relative import. `is:inline` tells Astro not to process/bundle
// this tag at all, so the `src` stays pointed at this real external file —
// it's never hashed or inlined into the page. The project-relative-import
// version of this same file (`<script>import '../scripts/parallax.ts'
// </script>`) got inlined by Vite's HTML build as a bare `<script
// type="module">` with the full body anyway, because the compiled output
// was small enough to trip Vite's own "just inline this tiny shared chunk"
// heuristic — which would otherwise mean giving script-src in
// public/_headers a sha256 hash that silently breaks on every future edit
// to this file. A real external file, explicitly opted out of bundling,
// has no such heuristic to trip.
//
// Not `data-astro-transition-persist`-ed, so ClientRouter tears the
// <script> tag down and re-inserts a fresh copy on every navigation. A
// plain (non-module) external script re-executes its whole body each time
// it's reinserted this way — there is no ES module singleton caching an
// absolute-URL classic script the way there is for `type="module"`
// imports — so `astro:page-load`/`astro:before-swap` gating here is about
// preventing duplicate listeners across that repeated execution, not about
// forcing a re-run that wouldn't otherwise happen.
(() => {
  let controller = null;

  function init() {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const desktopPointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (reducedMotion || !desktopPointer) return;

    controller = new AbortController();
    const MAX_OFFSET = 12; // px — subtle, not a full parallax scene
    let frame = 0;

    window.addEventListener(
      'mousemove',
      (e) => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          const x = (e.clientX / window.innerWidth - 0.5) * MAX_OFFSET;
          const y = (e.clientY / window.innerHeight - 0.5) * MAX_OFFSET;
          document.body.style.setProperty('--parallax-x', `${x}px`);
          document.body.style.setProperty('--parallax-y', `${y}px`);
        });
      },
      { signal: controller.signal },
    );
  }

  function cleanup() {
    controller?.abort();
    controller = null;
  }

  document.addEventListener('astro:page-load', init);
  document.addEventListener('astro:before-swap', cleanup);
})();
