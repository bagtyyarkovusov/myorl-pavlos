import { factories } from '@strapi/strapi';
// UID not yet in generated types — cast until Strapi regenerates
export default factories.createCoreService('api::url-mapping.url-mapping' as Parameters<typeof factories.createCoreService>[0]);
