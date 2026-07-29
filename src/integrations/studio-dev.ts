import type { AstroIntegration } from 'astro';

/**
 * Registers /studio for `astro dev` only — structurally, not by cleaning up
 * afterward. The pages live outside src/pages (in src/studio/, so Astro's
 * file-based router never sees them) and are injected as routes only when
 * `command === 'dev'`. During `astro build`, this hook returns before
 * calling `injectRoute` at all, so the route table simply never contains
 * /studio — there is nothing generated into dist/ to delete, and nothing
 * that breaks or has to be remembered if this file is reordered or edited.
 *
 * The write/orphan-cleanup API follows the same shape one level down: it's
 * only ever registered as `astro:server:setup` middleware on the `astro
 * dev` Vite server, a hook that never fires during `astro build` either.
 */
export function studioDev(): AstroIntegration {
  return {
    name: 'studio-dev',
    hooks: {
      'astro:config:setup': ({ command, injectRoute }) => {
        if (command !== 'dev') return;

        injectRoute({
          pattern: '/studio',
          entrypoint: new URL('../studio/index.astro', import.meta.url),
          prerender: false,
        });
        injectRoute({
          pattern: '/studio/[slug]',
          entrypoint: new URL('../studio/[slug].astro', import.meta.url),
          prerender: false,
        });
      },
      'astro:server:setup': ({ server }) => {
        const readJsonBody = (req: import('node:http').IncomingMessage): Promise<any> =>
          new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            req.on('data', (chunk) => chunks.push(chunk));
            req.on('end', () => {
              try {
                resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8')));
              } catch (error) {
                reject(error);
              }
            });
            req.on('error', reject);
          });

        // Loaded through Vite's own SSR module graph (not a plain Node
        // import) so that studio-save.ts's `astro:content` import resolves
        // — that virtual module only exists inside the app's Vite server,
        // which isn't available yet when this integration file itself is
        // loaded at astro.config time.
        const loadStudioSave = () => server.ssrLoadModule('/src/integrations/studio-save.ts');

        server.middlewares.use('/api/studio/save', (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end('Method not allowed');
            return;
          }
          readJsonBody(req)
            .then(async (payload) => {
              const mod = await loadStudioSave();
              const result = await mod.saveProject(payload);
              res.statusCode = result.status;
              res.setHeader('content-type', 'application/json');
              res.end(JSON.stringify(result));
            })
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('content-type', 'application/json');
              res.end(JSON.stringify({ ok: false, error: (error as Error).message }));
            });
        });

        server.middlewares.use('/api/studio/delete-orphans', (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end('Method not allowed');
            return;
          }
          readJsonBody(req)
            .then(async ({ slug, content, video }) => {
              const mod = await loadStudioSave();
              const result = mod.deleteOrphans(slug, { content, video });
              res.statusCode = 200;
              res.setHeader('content-type', 'application/json');
              res.end(JSON.stringify({ ok: true, ...result }));
            })
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('content-type', 'application/json');
              res.end(JSON.stringify({ ok: false, error: (error as Error).message }));
            });
        });
      },
    },
  };
}
