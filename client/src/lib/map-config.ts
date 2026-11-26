/**
 * Shared Leaflet tile configuration.
 *
 * Defaults to free OpenStreetMap tiles (no API key). Override with Vite env
 * vars if you move to a CDN/tile provider later:
 *   VITE_MAP_TILE_URL, VITE_MAP_TILE_ATTRIBUTION, VITE_MAP_TILE_SUBDOMAINS
 */
const env = import.meta.env as Record<string, string | undefined>;

export const MAP_TILE_URL =
  env.VITE_MAP_TILE_URL ?? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

export const MAP_TILE_ATTRIBUTION =
  env.VITE_MAP_TILE_ATTRIBUTION ??
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const MAP_TILE_SUBDOMAINS = env.VITE_MAP_TILE_SUBDOMAINS ?? "abc";

export const MAP_MAX_ZOOM = 19;