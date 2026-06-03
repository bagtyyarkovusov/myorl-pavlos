import type { Schema, Struct } from '@strapi/strapi';

export interface ItemsAccordionItem extends Struct.ComponentSchema {
  collectionName: 'components_items_accordion_items';
  info: {
    description: '';
    displayName: 'Accordion Item';
  };
  attributes: {
    content: Schema.Attribute.RichText;
    title: Schema.Attribute.String;
  };
}

export interface ItemsAdvantage extends Struct.ComponentSchema {
  collectionName: 'components_items_advantages';
  info: {
    description: '';
    displayName: 'Advantage';
  };
  attributes: {
    description: Schema.Attribute.Text;
    icon: Schema.Attribute.String;
    title: Schema.Attribute.String;
  };
}

export interface ItemsClinic extends Struct.ComponentSchema {
  collectionName: 'components_items_clinics';
  info: {
    description: '';
    displayName: 'Clinic';
  };
  attributes: {
    address: Schema.Attribute.RichText;
    email: Schema.Attribute.Email;
    latitude: Schema.Attribute.Decimal;
    longitude: Schema.Attribute.Decimal;
    name: Schema.Attribute.String;
    phone: Schema.Attribute.String;
  };
}

export interface ItemsContactDetail extends Struct.ComponentSchema {
  collectionName: 'components_items_contact_details';
  info: {
    description: '';
    displayName: 'Contact Detail';
  };
  attributes: {
    type: Schema.Attribute.String;
    value: Schema.Attribute.RichText;
  };
}

export interface ItemsFaqItem extends Struct.ComponentSchema {
  collectionName: 'components_items_faq_items';
  info: {
    description: '';
    displayName: 'FAQ Item';
  };
  attributes: {
    answer: Schema.Attribute.RichText;
    question: Schema.Attribute.String;
  };
}

export interface ItemsGalleryItem extends Struct.ComponentSchema {
  collectionName: 'components_items_gallery_items';
  info: {
    description: '';
    displayName: 'Gallery Item';
  };
  attributes: {
    caption: Schema.Attribute.String;
    image: Schema.Attribute.Media<'images'>;
  };
}

export interface ItemsLinkedResource extends Struct.ComponentSchema {
  collectionName: 'components_items_linked_resources';
  info: {
    description: '';
    displayName: 'Linked Resource';
  };
  attributes: {
    description: Schema.Attribute.RichText;
    legacySourceResourceId: Schema.Attribute.Integer & Schema.Attribute.Private;
    targetPage: Schema.Attribute.Relation<'manyToOne', 'api::page.page'>;
    targetUrl: Schema.Attribute.String;
    title: Schema.Attribute.String;
  };
}

export interface ItemsPromoSlide extends Struct.ComponentSchema {
  collectionName: 'components_items_promo_slides';
  info: {
    description: '';
    displayName: 'Promo Slide';
  };
  attributes: {
    description: Schema.Attribute.Text;
    image: Schema.Attribute.Media<'images'>;
    legacySourceResourceId: Schema.Attribute.Integer & Schema.Attribute.Private;
    targetPage: Schema.Attribute.Relation<'manyToOne', 'api::page.page'>;
    targetUrl: Schema.Attribute.String;
    title: Schema.Attribute.String;
  };
}

export interface ItemsSocialLink extends Struct.ComponentSchema {
  collectionName: 'components_items_social_links';
  info: {
    description: '';
    displayName: 'Social Link';
  };
  attributes: {
    icon: Schema.Attribute.String;
    name: Schema.Attribute.String;
    url: Schema.Attribute.Text;
  };
}

export interface ItemsTabItem extends Struct.ComponentSchema {
  collectionName: 'components_items_tab_items';
  info: {
    description: '';
    displayName: 'Tab Item';
  };
  attributes: {
    content: Schema.Attribute.RichText;
    link: Schema.Attribute.String;
    title: Schema.Attribute.String;
  };
}

export interface ItemsVideo extends Struct.ComponentSchema {
  collectionName: 'components_items_videos';
  info: {
    description: '';
    displayName: 'Video';
  };
  attributes: {
    thumbnail: Schema.Attribute.Media<'images'>;
    title: Schema.Attribute.String;
    videoMp4: Schema.Attribute.Media<'videos'>;
    videoTags: Schema.Attribute.String;
    videoWebm: Schema.Attribute.Media<'videos'>;
  };
}

export interface SectionsAccordion extends Struct.ComponentSchema {
  collectionName: 'components_sections_accordions';
  info: {
    description: '';
    displayName: 'Accordion Section';
  };
  attributes: {
    heading: Schema.Attribute.String;
    intro: Schema.Attribute.RichText;
    items: Schema.Attribute.Component<'items.accordion-item', true>;
  };
}

export interface SectionsAdvantages extends Struct.ComponentSchema {
  collectionName: 'components_sections_advantages';
  info: {
    description: '';
    displayName: 'Advantages Section';
  };
  attributes: {
    heading: Schema.Attribute.String;
    intro: Schema.Attribute.RichText;
    items: Schema.Attribute.Component<'items.advantage', true>;
  };
}

export interface SectionsContact extends Struct.ComponentSchema {
  collectionName: 'components_sections_contacts';
  info: {
    description: '';
    displayName: 'Contact Section';
  };
  attributes: {
    clinics: Schema.Attribute.Component<'items.clinic', true>;
    details: Schema.Attribute.Component<'items.contact-detail', true>;
    heading: Schema.Attribute.String;
    intro: Schema.Attribute.RichText;
  };
}

export interface SectionsFaq extends Struct.ComponentSchema {
  collectionName: 'components_sections_faqs';
  info: {
    description: '';
    displayName: 'FAQ Section';
  };
  attributes: {
    heading: Schema.Attribute.String;
    intro: Schema.Attribute.RichText;
    items: Schema.Attribute.Component<'items.faq-item', true>;
  };
}

export interface SectionsGallery extends Struct.ComponentSchema {
  collectionName: 'components_sections_galleries';
  info: {
    description: '';
    displayName: 'Gallery Section';
  };
  attributes: {
    heading: Schema.Attribute.String;
    intro: Schema.Attribute.RichText;
    items: Schema.Attribute.Component<'items.gallery-item', true>;
  };
}

export interface SectionsHomeHero extends Struct.ComponentSchema {
  collectionName: 'components_sections_home_heroes';
  info: {
    description: 'Editor-owned hero copy and primary CTA for the canonical home.';
    displayName: 'Home Hero Section';
  };
  attributes: {
    ctaLabel: Schema.Attribute.String;
    ctaTargetPage: Schema.Attribute.Relation<'oneToOne', 'api::page.page'>;
    ctaUrl: Schema.Attribute.String;
    heading: Schema.Attribute.String & Schema.Attribute.Required;
    intro: Schema.Attribute.Text;
    kicker: Schema.Attribute.String;
    media: Schema.Attribute.Media<'images'>;
  };
}

export interface SectionsHomeResourceGroup extends Struct.ComponentSchema {
  collectionName: 'components_sections_home_resource_groups';
  info: {
    description: 'Editor-owned resource group for the homepage (operations or services) with heading, items, and view-all target.';
    displayName: 'Home Resource Group';
  };
  attributes: {
    group: Schema.Attribute.Enumeration<['operations', 'services']> & Schema.Attribute.DefaultTo<'services'>;
    heading: Schema.Attribute.String & Schema.Attribute.Required;
    intro: Schema.Attribute.Text;
    items: Schema.Attribute.Component<'items.linked-resource', true>;
    viewAllLabel: Schema.Attribute.String;
    viewAllTarget: Schema.Attribute.Relation<'oneToOne', 'api::page.page'>;
  };
}

export interface SectionsHomeNotice extends Struct.ComponentSchema {
  collectionName: 'components_sections_home_notices';
  info: {
    description: 'Short editor-owned homepage notice from the legacy content specification.';
    displayName: 'Home Notice Section';
  };
  attributes: {
    heading: Schema.Attribute.String;
    intro: Schema.Attribute.RichText;
  };
}

export interface SectionsHomeTestimonialsTeaser extends Struct.ComponentSchema {
  collectionName: 'components_sections_home_testimonials_teasers';
  info: {
    description: 'Editor-owned heading and intro for the homepage testimonials preview.';
    displayName: 'Home Testimonials Teaser';
  };
  attributes: {
    heading: Schema.Attribute.String & Schema.Attribute.Required;
    intro: Schema.Attribute.Text;
  };
}

export interface SectionsLinkedResources extends Struct.ComponentSchema {
  collectionName: 'components_sections_linked_resources';
  info: {
    description: '';
    displayName: 'Linked Resources Section';
  };
  attributes: {
    heading: Schema.Attribute.String;
    intro: Schema.Attribute.RichText;
    items: Schema.Attribute.Component<'items.linked-resource', true>;
  };
}

export interface SectionsPromoSlider extends Struct.ComponentSchema {
  collectionName: 'components_sections_promo_sliders';
  info: {
    description: '';
    displayName: 'Promo Slider Section';
  };
  attributes: {
    heading: Schema.Attribute.String;
    intro: Schema.Attribute.RichText;
    slides: Schema.Attribute.Component<'items.promo-slide', true>;
  };
}

export interface SectionsSocialLinks extends Struct.ComponentSchema {
  collectionName: 'components_sections_social_links';
  info: {
    description: '';
    displayName: 'Social Links Section';
  };
  attributes: {
    heading: Schema.Attribute.String;
    intro: Schema.Attribute.RichText;
    links: Schema.Attribute.Component<'items.social-link', true>;
  };
}

export interface SectionsTabs extends Struct.ComponentSchema {
  collectionName: 'components_sections_tabs';
  info: {
    description: '';
    displayName: 'Tabs Section';
  };
  attributes: {
    heading: Schema.Attribute.String;
    intro: Schema.Attribute.RichText;
    items: Schema.Attribute.Component<'items.tab-item', true>;
  };
}

export interface SectionsVideo extends Struct.ComponentSchema {
  collectionName: 'components_sections_videos';
  info: {
    description: '';
    displayName: 'Video Section';
  };
  attributes: {
    heading: Schema.Attribute.String;
    intro: Schema.Attribute.RichText;
    videos: Schema.Attribute.Component<'items.video', true>;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    description: '';
    displayName: 'SEO';
  };
  attributes: {
    canonicalUrl: Schema.Attribute.String;
    metaDescription: Schema.Attribute.Text;
    metaTitle: Schema.Attribute.String;
    ogImage: Schema.Attribute.Media<'images'>;
    robotsNofollow: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    robotsNoindex: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    schemaType: Schema.Attribute.Enumeration<
      [
        'WebPage',
        'MedicalWebPage',
        'AboutPage',
        'ContactPage',
        'CollectionPage',
      ]
    >;
    sitemapChangeFrequency: Schema.Attribute.Enumeration<
      ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']
    >;
    sitemapExclude: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    sitemapPriority: Schema.Attribute.Decimal;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'items.accordion-item': ItemsAccordionItem;
      'items.advantage': ItemsAdvantage;
      'items.clinic': ItemsClinic;
      'items.contact-detail': ItemsContactDetail;
      'items.faq-item': ItemsFaqItem;
      'items.gallery-item': ItemsGalleryItem;
      'items.linked-resource': ItemsLinkedResource;
      'items.promo-slide': ItemsPromoSlide;
      'items.social-link': ItemsSocialLink;
      'items.tab-item': ItemsTabItem;
      'items.video': ItemsVideo;
      'sections.accordion': SectionsAccordion;
      'sections.advantages': SectionsAdvantages;
      'sections.contact': SectionsContact;
      'sections.faq': SectionsFaq;
      'sections.gallery': SectionsGallery;
      'sections.home-hero': SectionsHomeHero;
      'sections.home-notice': SectionsHomeNotice;
      'sections.home-testimonials-teaser': SectionsHomeTestimonialsTeaser;
      'sections.linked-resources': SectionsLinkedResources;
      'sections.promo-slider': SectionsPromoSlider;
      'sections.social-links': SectionsSocialLinks;
      'sections.tabs': SectionsTabs;
      'sections.video': SectionsVideo;
      'shared.seo': SharedSeo;
    }
  }
}
