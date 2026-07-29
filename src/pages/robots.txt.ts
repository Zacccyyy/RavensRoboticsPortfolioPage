import type { APIRoute } from 'astro';
import siteConfig from '../../site.config';

// Prerendered at build time (default for static output) — this is static
// content, not per-request. /studio isn't listed: it has no presence in
// the build to disallow (see src/integrations/studio-dev.ts), and a
// Disallow rule for a route that structurally can't exist would only
// mislead a crawler into thinking it might.
export const GET: APIRoute = () => {
  const body = `User-agent: *
Allow: /

Sitemap: ${siteConfig.seo.siteUrl}/sitemap-index.xml
`;
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
