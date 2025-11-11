// Centralized frontend configuration values
// Use environment variables when available, otherwise fall back to localhost
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// SERVER_URL is used by socket/io and generator endpoints. Default to API_BASE
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || API_BASE;

// Helper: build full API path for backend endpoints
export function apiPath(path: string) {
  // ensure leading slash
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${p}`;
}
