// @ts-check
import { defineConfig } from 'astro/config';

// Set SITE_URL (e.g. https://alexmenzies.be) when you have a domain. It is used for
// canonical links and social-share (Open Graph) image URLs. Without it the site still
// builds and works; those tags are simply left out.
const site = process.env.SITE_URL || undefined;

// https://astro.build/config
export default defineConfig({
  site,
  compressHTML: true,
  devToolbar: { enabled: false },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  image: {
    // Generated image variants are cached in node_modules/.astro, so only the first build is slow.
    service: { entrypoint: 'astro/assets/services/sharp', config: { limitInputPixels: false } },
  },
});
