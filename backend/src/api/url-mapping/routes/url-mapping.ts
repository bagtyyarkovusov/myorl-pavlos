import { factories } from '@strapi/strapi';
// UID not yet in generated types — cast until Strapi regenerates
export default factories.createCoreRouter('api::url-mapping.url-mapping' as Parameters<typeof factories.createCoreRouter>[0]);
