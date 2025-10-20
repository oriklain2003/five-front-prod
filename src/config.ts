// Centralized environment-based configuration for frontend
// CRA exposes variables prefixed with REACT_APP_

const getWindowOrigin = (): string => {
  try {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }
  } catch {}
  return '';
};

export const API_BASE_URL: string =
  (process.env.REACT_APP_API_BASE_URL as string) || getWindowOrigin();

// socket.io client accepts http(s) URLs and upgrades to WS under the hood
export const WS_URL: string =
  (process.env.REACT_APP_WS_URL as string) || API_BASE_URL;

export const MAPTILER_API_KEY: string =
  (process.env.REACT_APP_MAPTILER_API_KEY as string) || '';

export const buildApiUrl = (path: string): string => {
  const base = API_BASE_URL.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
};


