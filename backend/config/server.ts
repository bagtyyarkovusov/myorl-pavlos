import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  // Trust the X-Forwarded-* headers from Railway's TLS-terminating reverse
  // proxy. Without this, Strapi sees the request as http:// and emits
  // password-reset emails / admin redirects / cookies with the wrong scheme.
  proxy: env.bool('IS_PROXIED', true),
  // Public origin Strapi advertises to itself. Set STRAPI_PUBLIC_URL on the
  // backend Railway service to the public https URL of the strapi-backend
  // (e.g. https://strapi-backend-xxx.up.railway.app). Empty string falls back
  // to the host header, which is correct in local dev but unreliable on Railway.
  url: env('STRAPI_PUBLIC_URL', ''),
  app: {
    keys: env.array('APP_KEYS'),
  },
});

export default config;
