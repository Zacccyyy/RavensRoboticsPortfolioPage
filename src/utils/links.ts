// Every internal link in this site is a root-relative path or fragment
// ("/", "/#work", "/projects/foo") — anything else (a social profile URL,
// links.demo, a downloads[] URL, mailto:) is leaving the site. Spread this
// onto every <a> that renders one of those, rather than writing
// target/rel by hand, so a new link-rendering spot can't forget it.
//
// target="_blank" keeps this tab (and its state — the project grid's
// scroll position, an open lightbox, etc.) alive instead of navigating
// away from it. rel="noopener" stops the newly opened page from reaching
// back into this tab via `window.opener` (which it could otherwise use to
// redirect it somewhere else — the classic tab-nabbing attack); "noreferrer"
// additionally stops this page's own URL from being sent to the
// destination as the Referer header.
export function externalLinkAttrs(url: string): { target: '_blank'; rel: 'noopener noreferrer' } | Record<string, never> {
  if (url.startsWith('/') || url.startsWith('#')) return {};
  return { target: '_blank', rel: 'noopener noreferrer' };
}
