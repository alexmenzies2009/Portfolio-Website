import type { APIRoute } from 'astro';
import { buildAtlas } from '../../lib/mosaic';

export const GET: APIRoute = async () => {
  const { buffer } = await buildAtlas();
  return new Response(new Uint8Array(buffer), { headers: { 'Content-Type': 'image/webp' } });
};
