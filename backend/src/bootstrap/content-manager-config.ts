/**
 * Seeds Content Manager view configurations for key content types so that
 * editors get readable relation labels, a hierarchy-aware list view, and a
 * logically grouped edit view without having to click through the admin UI.
 *
 * Runs once per `SEED_VERSION` marker — editors can still tweak the views in
 * the admin; bumping the version in this file re-applies the baseline.
 */

import type { Core } from "@strapi/strapi";

type ContentTypeSchema = {
  attributes: Record<string, unknown>;
};

const SEED_VERSION = 'v7';
const MARKER_KEY = 'hierarchy_ui_seed_version';

type EditRow = Array<{ name: string; size: number }>;
type FieldMetadata = { edit: Record<string, unknown>; list: Record<string, unknown> };
type CMConfig = {
  settings: Record<string, unknown>;
  metadatas: Record<string, FieldMetadata>;
  layouts: { list: string[]; edit: EditRow[] };
};
type CMConfigOverride = {
  settings?: Record<string, unknown>;
  metadatas?: Record<string, Partial<FieldMetadata>>;
  layouts?: Partial<CMConfig['layouts']>;
};

const pageConfig: CMConfigOverride = {
  settings: {
    bulkable: true,
    filterable: true,
    searchable: true,
    pageSize: 25,
    mainField: 'title',
    defaultSortBy: 'menuIndex',
    defaultSortOrder: 'ASC',
    relationOpenMode: 'newTab',
  },
  metadatas: {
    title: {
      edit: { label: 'Title', description: '', placeholder: '', visible: true, editable: true },
      list: { label: 'Title', searchable: true, sortable: true },
    },
    menuTitle: {
      edit: {
        label: 'Menu title',
        description: 'Optional shorter navigation label used by Next.js when it differs from the page title',
        placeholder: '',
        visible: true,
        editable: true,
      },
      list: { label: 'Menu title', searchable: true, sortable: true },
    },
    slug: {
      edit: { label: 'Slug', description: 'URL-safe identifier derived from Title', placeholder: '', visible: true, editable: true },
      list: { label: 'Slug', searchable: true, sortable: true },
    },
    excerpt: {
      edit: { label: 'Excerpt', description: 'Short summary used in listings and SEO fallbacks', placeholder: '', visible: true, editable: true },
      list: { label: 'Excerpt', searchable: true, sortable: false },
    },
    content: {
      edit: { label: 'Content', description: 'Main body (rich text)', placeholder: '', visible: true, editable: true },
      list: { label: 'Content', searchable: false, sortable: false },
    },
    seo: {
      edit: { label: 'SEO', description: 'Meta title, description, share image', placeholder: '', visible: true, editable: true },
      list: { label: 'SEO', searchable: false, sortable: false },
    },
    parentPage: {
      edit: {
        label: 'Parent page',
        description: 'Pick the page this one sits under in the hierarchy',
        placeholder: '',
        visible: true,
        editable: true,
        mainField: 'title',
      },
      list: { label: 'Parent', searchable: true, sortable: true },
    },
    childrenPages: {
      edit: {
        label: 'Children pages',
        description: 'Pages nested under this one (auto-populated from parent picks)',
        placeholder: '',
        visible: true,
        editable: true,
        mainField: 'title',
      },
      list: { label: 'Children', searchable: false, sortable: false },
    },
    tags: {
      edit: {
        label: 'Tags',
        description: 'Taxonomy labels that group this page across the tree',
        placeholder: '',
        visible: true,
        editable: true,
        mainField: 'name',
      },
      list: { label: 'Tags', searchable: false, sortable: false },
    },
    relatedPages: {
      edit: {
        label: 'Related pages',
        description: 'Cross-links shown to readers alongside this page',
        placeholder: '',
        visible: true,
        editable: true,
        mainField: 'title',
      },
      list: { label: 'Related', searchable: false, sortable: false },
    },
    featuredImage: {
      edit: { label: 'Featured image', description: 'Primary media asset', placeholder: '', visible: true, editable: true },
      list: { label: 'Featured', searchable: false, sortable: false },
    },
    imageCenter: {
      edit: { label: 'Image (center)', description: 'Secondary centered image', placeholder: '', visible: true, editable: true },
      list: { label: 'Image center', searchable: false, sortable: false },
    },
    pageType: {
      edit: {
        label: 'Page type',
        description: 'Semantic editorial page contract used by the new renderers and migration scripts',
        placeholder: '',
        visible: true,
        editable: true,
      },
      list: { label: 'Page type', searchable: true, sortable: true },
    },
    layoutVariant: {
      edit: {
        label: 'Layout variant',
        description: 'Template-specific visual or structural variant for the selected page type',
        placeholder: '',
        visible: true,
        editable: true,
      },
      list: { label: 'Layout', searchable: true, sortable: true },
    },
    externalUrl: {
      edit: { label: 'External URL', description: 'If set, the page links out to this URL', placeholder: '', visible: true, editable: true },
      list: { label: 'External URL', searchable: true, sortable: true },
    },
    isFolder: {
      edit: { label: 'Is folder', description: 'Folder-only nodes group children without rendering a page', placeholder: '', visible: true, editable: true },
      list: { label: 'Folder', searchable: false, sortable: true },
    },
    hideFromMenu: {
      edit: { label: 'Hide from menu', description: 'Exclude from site navigation', placeholder: '', visible: true, editable: true },
      list: { label: 'Hidden', searchable: false, sortable: true },
    },
    menuIndex: {
      edit: { label: 'Menu order', description: 'Sort order among siblings (lower = first)', placeholder: '', visible: true, editable: true },
      list: { label: 'Order', searchable: false, sortable: true },
    },
    articleAuthor: {
      edit: { label: 'Article author', description: '', placeholder: '', visible: true, editable: true },
      list: { label: 'Author', searchable: true, sortable: true },
    },
    sources: {
      edit: { label: 'Sources', description: 'Citations / references', placeholder: '', visible: true, editable: true },
      list: { label: 'Sources', searchable: false, sortable: false },
    },
    popUpClose: {
      edit: { label: 'Pop-up close block', description: 'Content rendered when a pop-up is dismissed', placeholder: '', visible: true, editable: true },
      list: { label: 'Pop-up close', searchable: false, sortable: false },
    },
    infoBlockBottom: {
      edit: { label: 'Info block (bottom)', description: '', placeholder: '', visible: true, editable: true },
      list: { label: 'Info bottom', searchable: false, sortable: false },
    },
    pageSections: {
      edit: {
        label: 'Page sections',
        description: 'Ordered flexible sections rendered on this page',
        placeholder: '',
        visible: true,
        editable: true,
      },
      list: { label: 'Sections', searchable: false, sortable: false },
    },
  },
  layouts: {
    // Self-relations in the list view have been the most fragile part of the
    // Page admin configuration across Strapi upgrades, so keep the list view
    // to scalar/boolean fields and leave hierarchy browsing to the edit view
    // and Navigation plugin.
    list: ['title', 'slug', 'pageType', 'layoutVariant', 'menuIndex', 'isFolder', 'hideFromMenu'],
    edit: [
      [{ name: 'title', size: 6 }, { name: 'menuTitle', size: 6 }],
      [{ name: 'slug', size: 12 }],
      [{ name: 'pageType', size: 6 }, { name: 'layoutVariant', size: 6 }],
      [{ name: 'parentPage', size: 6 }, { name: 'menuIndex', size: 3 }, { name: 'isFolder', size: 3 }],
      [{ name: 'hideFromMenu', size: 3 }, { name: 'externalUrl', size: 9 }],
      [{ name: 'childrenPages', size: 6 }, { name: 'tags', size: 6 }],
      [{ name: 'relatedPages', size: 6 }, { name: 'excerpt', size: 6 }],
      [{ name: 'articleAuthor', size: 6 }, { name: 'featuredImage', size: 6 }],
      [{ name: 'imageCenter', size: 6 }, { name: 'seo', size: 6 }],
      [{ name: 'content', size: 12 }],
      [{ name: 'pageSections', size: 12 }],
      [{ name: 'infoBlockBottom', size: 12 }],
      [{ name: 'sources', size: 12 }],
      [{ name: 'popUpClose', size: 12 }],
    ],
  },
};

const tagConfig: CMConfigOverride = {
  settings: {
    bulkable: true,
    filterable: true,
    searchable: true,
    pageSize: 50,
    mainField: 'name',
    defaultSortBy: 'name',
    defaultSortOrder: 'ASC',
    relationOpenMode: 'newTab',
  },
  metadatas: {
    name: {
      edit: { label: 'Name', description: '', placeholder: '', visible: true, editable: true },
      list: { label: 'Name', searchable: true, sortable: true },
    },
    slug: {
      edit: {
        label: 'Slug',
        description: 'Canonical taxonomy key used by the Next.js frontend for routes and filter state',
        placeholder: '',
        visible: true,
        editable: true,
      },
      list: { label: 'Slug', searchable: true, sortable: true },
    },
    pages: {
      edit: {
        label: 'Pages',
        description: 'Pages tagged with this label',
        placeholder: '',
        visible: true,
        editable: true,
        mainField: 'title',
      },
      list: { label: 'Pages', searchable: false, sortable: false },
    },
  },
  layouts: {
    list: ['name', 'slug', 'pages'],
    edit: [
      [{ name: 'name', size: 6 }, { name: 'slug', size: 6 }],
      [{ name: 'pages', size: 12 }],
    ],
  },
};

type SeedEntry = { uid: string; config: CMConfigOverride };
const SEEDS: SeedEntry[] = [
  { uid: 'api::page.page', config: pageConfig },
  { uid: 'api::tag.tag', config: tagConfig },
];

function mergeMetadatas(
  currentMetadatas: Record<string, FieldMetadata> = {},
  nextMetadatas: Record<string, Partial<FieldMetadata>> = {},
): Record<string, FieldMetadata> {
  const merged: Record<string, FieldMetadata> = { ...currentMetadatas };

  for (const [name, metadata] of Object.entries(nextMetadatas)) {
    const current = currentMetadatas[name];

    merged[name] = {
      edit: {
        ...(current?.edit ?? {}),
        ...(metadata.edit ?? {}),
      },
      list: {
        ...(current?.list ?? {}),
        ...(metadata.list ?? {}),
      },
    };
  }

  return merged;
}

function removeStaleMetadatas(
  metadatas: Record<string, FieldMetadata>,
  contentType: ContentTypeSchema,
): Record<string, FieldMetadata> {
  const validFields = new Set(Object.keys(contentType?.attributes ?? {}));
  const cleaned: Record<string, FieldMetadata> = {};

  for (const [name, metadata] of Object.entries(metadatas)) {
    if (validFields.has(name)) {
      cleaned[name] = metadata;
    }
  }

  return cleaned;
}

function sanitizeListLayout(
  layout: string[] | undefined,
  contentType: ContentTypeSchema,
  metadatas: Record<string, FieldMetadata>,
): string[] {
  const validFields = new Set(Object.keys(contentType?.attributes ?? {}));

  return (layout ?? []).filter((fieldName) => {
    if (!validFields.has(fieldName)) {
      return false;
    }

    const listMetadata = metadatas[fieldName]?.list;
    return Boolean(listMetadata && typeof listMetadata.label === 'string');
  });
}

function sanitizeEditLayout(layout: EditRow[] | undefined, contentType: ContentTypeSchema): EditRow[] {
  const validFields = new Set(Object.keys(contentType?.attributes ?? {}));

  return (layout ?? [])
    .map((row) => row.filter((field) => validFields.has(field.name)))
    .filter((row) => row.length > 0);
}

function getFallbackListLayout(contentType: ContentTypeSchema, metadatas: Record<string, FieldMetadata>): string[] {
  const preferredFields = ['title', 'slug', 'menuIndex', 'isFolder', 'hideFromMenu', 'name'];
  const available = preferredFields.filter((fieldName) => metadatas[fieldName]?.list);

  if (available.length > 0) {
    return available;
  }

  return Object.keys(contentType?.attributes ?? {}).filter((fieldName) => metadatas[fieldName]?.list).slice(0, 4);
}

function buildSeedConfig(currentConfig: CMConfig, override: CMConfigOverride, contentType: ContentTypeSchema): CMConfig {
  const metadatas = removeStaleMetadatas(
    mergeMetadatas(currentConfig.metadatas, override.metadatas),
    contentType,
  );
  const requestedListLayout = override.layouts?.list ?? currentConfig.layouts?.list;
  const requestedEditLayout = override.layouts?.edit ?? currentConfig.layouts?.edit;
  const listLayout = sanitizeListLayout(requestedListLayout, contentType, metadatas);
  const editLayout = sanitizeEditLayout(requestedEditLayout, contentType);

  return {
    settings: {
      ...currentConfig.settings,
      ...(override.settings ?? {}),
    },
    metadatas,
    layouts: {
      list: listLayout.length > 0 ? listLayout : getFallbackListLayout(contentType, metadatas),
      edit: editLayout.length > 0 ? editLayout : currentConfig.layouts.edit,
    },
  };
}

export async function seedContentManagerConfig(strapi: Core.Strapi): Promise<void> {
  const store = strapi.store({ type: 'plugin', name: 'content_manager' });

  const markerValue = await store.get({ key: MARKER_KEY });
  if (markerValue === SEED_VERSION) {
    return;
  }

  const contentTypesService = strapi.plugin('content-manager').service('content-types');
  if (!contentTypesService) {
    strapi.log.warn('[hierarchy-ui] content-manager content-types service not available, skipping seed');
    return;
  }

  await contentTypesService.syncConfigurations();

  for (const { uid, config } of SEEDS) {
    const contentType = strapi.contentTypes[uid];
    if (!contentType) {
      strapi.log.warn(`[hierarchy-ui] content type ${uid} not found, skipping`);
      continue;
    }
    try {
      const currentConfig = await contentTypesService.findConfiguration(contentType);
      const nextConfig = buildSeedConfig(currentConfig, config, contentType);

      await contentTypesService.updateConfiguration(contentType, nextConfig);
      strapi.log.info(`[hierarchy-ui] seeded Content Manager view for ${uid}`);
    } catch (err) {
      strapi.log.error(`[hierarchy-ui] failed to seed Content Manager view for ${uid}`, err);
    }
  }

  await store.set({ key: MARKER_KEY, value: SEED_VERSION });
  strapi.log.info(`[hierarchy-ui] Content Manager view seed marker set to ${SEED_VERSION}`);
}
