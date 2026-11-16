import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * One folder per project in src/content/work, with an index.md inside.
 * The folder name becomes the URL: src/content/work/my-project/ -> /work/my-project
 * Images are picked up from the same folder automatically (see src/lib/work.ts).
 */
const work = defineCollection({
  loader: glob({ pattern: '*/index.md', base: './src/content/work', generateId: ({ entry }) => entry.split('/')[0] }),
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    /** Shown on cards and the project page, e.g. "Design & Animation" */
    category: z.string(),
    /** Used by the filters on /work: Branding, Design, Print, UI/UX, Animation, AI */
    tags: z.array(z.string()),
    tools: z.array(z.string()).default([]),
    /** Position in the work list (1 = first). Leave out and the project goes to the very front. */
    order: z.number().default(0),
    /** Show on the home page under "Selected work" */
    featured: z.boolean().default(false),
    /** The colour the site borrows while this project is in focus. Leave out for neutral. */
    accent: z.string().optional(),
    link: z.object({ label: z.string(), url: z.url() }).optional(),
    video: z.object({ provider: z.enum(['youtube', 'vimeo']), id: z.string() }).optional(),
  }),
});

export const collections = { work };
