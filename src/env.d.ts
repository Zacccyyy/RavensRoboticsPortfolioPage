/// <reference path="../.astro/types.d.ts" />

// Neither package ships types or has a @types/* package — both are only
// ever dynamically imported for their custom-element side effect (see
// VideoEmbed.astro), never for a value this codebase reads, so an ambient
// "the module exists" declaration is all `astro check` needs here.
declare module 'lite-youtube-embed';
declare module 'lite-vimeo-embed';
