const IS_PROD = import.meta.env.PROD;

/**
 * Backend URL configuration:
 * - In Production (Vercel): Uses the full URL of the deployed backend.
 * - In Development: Uses '/api' which is proxied by Vite to localhost:3000.
 */
export const API_BASE_URL = IS_PROD
  ? 'https://lidorpahima-faddom-aws-metrics-dash.vercel.app/api'
  : '/api';
