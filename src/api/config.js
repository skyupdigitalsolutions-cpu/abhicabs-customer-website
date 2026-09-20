/**
 * src/api/config.js
 * Each variable accessed individually so Vike/Vite can statically inline them.
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1';

export const USE_MOCK =
  String(import.meta.env.VITE_USE_MOCK ?? 'false').toLowerCase() === 'true';

export const MOCK_FALLBACK =
  String(import.meta.env.VITE_MOCK_FALLBACK ?? 'false').toLowerCase() === 'true';

export const TOKEN_KEYS = {
  access:  'abhicabs_access_token',
  refresh: 'abhicabs_refresh_token',
};

export const REQUEST_TIMEOUT = 15000;

export const RAZORPAY_KEY_ID =
  import.meta.env.VITE_RAZORPAY_KEY_ID ?? '';

export const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';
