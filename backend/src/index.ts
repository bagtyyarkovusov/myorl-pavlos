// import type { Core } from '@strapi/strapi';
import crypto from 'crypto';
import { seedContentManagerConfig } from './bootstrap/content-manager-config';
import { seedNavigationConfig } from './bootstrap/navigation-config';
import { seedNavigationPermissions } from './bootstrap/navigation-permissions';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }/*: { strapi: Core.Strapi }*/) {
    // Generate a Full Access API Token if it doesn't exist
    const tokenExists = await strapi.db.query('admin::api-token').findOne({
      where: { name: 'Migration Token' },
    });

    if (!tokenExists) {
      try {
        const apiTokenService = strapi.service('admin::api-token');
        const token = await apiTokenService.create({
          name: 'Migration Token',
          description: 'Full access token for migration',
          type: 'full-access',
          lifespan: null,
        });
        strapi.log.info('=============================================');
        strapi.log.info('API Token successfully created for migration!');
        strapi.log.info(`TOKEN: ${token.accessKey}`);
        strapi.log.info('Please note, the actual raw token is only visible here once.');
        strapi.log.info('=============================================');
      } catch (err) {
        strapi.log.error('Failed to create API Token', err);
      }
    }

    try {
      await seedContentManagerConfig(strapi);
    } catch (err) {
      strapi.log.error('Failed to seed Content Manager view configuration', err);
    }

    try {
      await seedNavigationConfig(strapi);
    } catch (err) {
      strapi.log.error('Failed to self-heal Navigation plugin config', err);
    }

    try {
      await seedNavigationPermissions(strapi);
    } catch (err) {
      strapi.log.error('Failed to seed Navigation plugin permissions', err);
    }
  },
};
