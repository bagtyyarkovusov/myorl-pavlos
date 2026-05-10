// import type { Core } from '@strapi/strapi';
import { seedContentManagerConfig } from './bootstrap/content-manager-config';
import { seedDesignSystemAudit } from './bootstrap/seed-design-system-audit';
import { migrateSections } from './bootstrap/migrate-sections';
import { seedNavigationConfig } from './bootstrap/navigation-config';
import { seedNavigationPermissions } from './bootstrap/navigation-permissions';
import { seedGlobal } from './bootstrap/seed-global';
import { suppressIndexRenames } from './register/suppress-index-renames';

function shouldBootstrapMigrationToken(): boolean {
  const raw = process.env.STRAPI_ENABLE_MIGRATION_TOKEN_BOOTSTRAP?.trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  async register({ strapi }/*: { strapi: Core.Strapi }*/) {
    try {
      await suppressIndexRenames(strapi);
    } catch (err) {
      strapi.log.error('Failed to suppress Strapi index rename migrations', err);
    }
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }/*: { strapi: Core.Strapi }*/) {
    if (shouldBootstrapMigrationToken()) {
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
    } else {
      strapi.log.info(
        'Skipping migration token bootstrap; set STRAPI_ENABLE_MIGRATION_TOKEN_BOOTSTRAP=true to enable it.',
      );
    }

    try {
      await migrateSections(strapi);
    } catch (err) {
      strapi.log.error('Failed to migrate dedicated section fields to DynamicZone', err);
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

    try {
      await seedDesignSystemAudit(strapi);
    } catch (err) {
      strapi.log.error('Failed to seed design-system audit reference page', err);
    }

    try {
      await seedGlobal(strapi);
    } catch (err) {
      strapi.log.error('Failed to seed Global content type entries', err);
    }
  },
};
