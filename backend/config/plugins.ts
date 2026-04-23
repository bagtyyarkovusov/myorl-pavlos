import type { Core } from '@strapi/strapi';

const config = (_params: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  navigation: {
    enabled: true,
    config: {
      contentTypes: ['api::page.page'],
      defaultContentType: 'api::page.page',
      contentTypesNameFields: {
        'api::page.page': ['title'],
      },
      pathDefaultFields: {
        'api::page.page': ['slug'],
      },
      additionalFields: ['audience'],
      allowedLevels: 6,
      cascadeMenuAttached: true,
      // strapi-plugin-navigation always maintains one tree per locale. We treat
      // `el` as the source of truth (set Strapi default locale to el) and
      // mirror into `ru` via the admin UI's "copy from el locale" bootstrap.
      // Pruning keeps the per-locale nav shells in sync when an editor
      // deletes a navigation in the default locale.
      pruneObsoleteI18nNavigations: true,
    },
  },
});

export default config;
