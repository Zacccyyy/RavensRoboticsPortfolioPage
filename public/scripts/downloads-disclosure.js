// Downloads disclosure behavior for LinkRow.astro. Lives in public/,
// referenced with a real absolute `src="/scripts/downloads-disclosure.js"`
// and `is:inline` (see public/scripts/parallax.js for the full explanation
// of why: a project-relative-import version of this file got inlined by
// Vite's HTML build as a bare `<script type="module">` with its full body
// anyway, since the compiled output was small enough to trip Vite's
// "just inline this tiny chunk" heuristic — which would otherwise mean
// giving script-src in public/_headers a sha256 hash that silently breaks
// on every future edit to this file).
//
// Not `type="module"`, so — like parallax.js — there's no ES module
// singleton caching: ClientRouter tearing down and reinserting this
// `<script>` tag on every navigation makes the whole body genuinely
// re-run each time, same as the original inlined version did. The
// `document`-level keydown/click listeners below need explicit cleanup on
// `astro:before-swap` regardless — `document` itself persists across
// navigations (unlike the `[data-downloads]` roots, which get removed
// with the old page), so without this they'd stack a new pair on every
// navigation.
(() => {
  let controller = null;

  function init() {
    controller = new AbortController();
    const { signal } = controller;

    document.querySelectorAll('[data-downloads]').forEach((root) => {
      const trigger = root.querySelector('[data-downloads-trigger]');
      const panel = root.querySelector('[data-downloads-panel]');
      const chevron = root.querySelector('[data-downloads-chevron]');
      if (!trigger || !panel) return;

      // Progressive enhancement: the panel ships open in the server-rendered
      // HTML (so downloads are reachable even if this script never runs),
      // then gets collapsed here once JS is confirmed to be running.
      const setOpen = (open) => {
        trigger.setAttribute('aria-expanded', String(open));
        panel.hidden = !open;
        chevron?.style.setProperty('transform', open ? 'rotate(180deg)' : 'rotate(0deg)');
      };

      setOpen(false);

      trigger.addEventListener('click', () => {
        setOpen(trigger.getAttribute('aria-expanded') !== 'true');
      }, { signal });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && trigger.getAttribute('aria-expanded') === 'true') {
          setOpen(false);
          trigger.focus();
        }
      }, { signal });

      document.addEventListener('click', (e) => {
        if (trigger.getAttribute('aria-expanded') === 'true' && !root.contains(e.target)) {
          setOpen(false);
        }
      }, { signal });
    });
  }

  function cleanup() {
    controller?.abort();
    controller = null;
  }

  document.addEventListener('astro:page-load', init);
  document.addEventListener('astro:before-swap', cleanup);
})();
