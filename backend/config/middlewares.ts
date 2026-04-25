import type { Core } from '@strapi/strapi';

const defaultCorsOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Middlewares => {
  const configuredOrigins = env.array('STRAPI_CORS_ORIGINS', []);
  const corsOrigins = configuredOrigins.length > 0 ? configuredOrigins : defaultCorsOrigins;

  return [
    'strapi::logger',
    'strapi::errors',
    'strapi::security',
    {
      name: 'strapi::cors',
      config: {
        origin: corsOrigins,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
        headers: '*',
      },
    },
    'strapi::poweredBy',
    'strapi::query',
    'strapi::body',
    'strapi::session',
    'strapi::favicon',
    'strapi::public',
  ];
};

export default config;
