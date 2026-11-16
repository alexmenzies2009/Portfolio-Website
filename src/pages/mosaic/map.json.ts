import type { APIRoute } from 'astro';
import { buildMap } from '../../lib/mosaic';

export const GET: APIRoute = async () => new Response(JSON.stringify(await buildMap()), { headers: { 'Content-Type': 'application/json' } });
