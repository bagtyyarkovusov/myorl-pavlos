import type { Schema, Struct } from '@strapi/strapi';

export interface BlocksAccordionItem extends Struct.ComponentSchema {
  collectionName: 'components_blocks_accordion_items';
  info: {
    description: '';
    displayName: 'Accordion Item';
  };
  attributes: {
    content: Schema.Attribute.RichText;
    title: Schema.Attribute.String;
  };
}

export interface BlocksAdvantage extends Struct.ComponentSchema {
  collectionName: 'components_blocks_advantages';
  info: {
    displayName: 'Advantage';
  };
  attributes: {
    description: Schema.Attribute.Text;
    icon: Schema.Attribute.String;
    title: Schema.Attribute.String;
  };
}

export interface BlocksClinic extends Struct.ComponentSchema {
  collectionName: 'components_blocks_clinics';
  info: {
    description: '';
    displayName: 'Clinic';
  };
  attributes: {
    address: Schema.Attribute.String;
    email: Schema.Attribute.Email;
    latitude: Schema.Attribute.Decimal;
    longitude: Schema.Attribute.Decimal;
    name: Schema.Attribute.String;
    phone: Schema.Attribute.String;
  };
}

export interface BlocksContactDetail extends Struct.ComponentSchema {
  collectionName: 'components_blocks_contact_details';
  info: {
    displayName: 'Contact Detail';
  };
  attributes: {
    type: Schema.Attribute.String;
    value: Schema.Attribute.String;
  };
}

export interface BlocksFaqItem extends Struct.ComponentSchema {
  collectionName: 'components_blocks_faq_items';
  info: {
    description: '';
    displayName: 'FAQ Item';
  };
  attributes: {
    answer: Schema.Attribute.Text;
    question: Schema.Attribute.String;
  };
}

export interface BlocksGalleryImage extends Struct.ComponentSchema {
  collectionName: 'components_blocks_gallery_images';
  info: {
    description: '';
    displayName: 'Gallery Image';
  };
  attributes: {
    caption: Schema.Attribute.String;
    image: Schema.Attribute.Media<'images'>;
  };
}

export interface BlocksPromoSlide extends Struct.ComponentSchema {
  collectionName: 'components_blocks_promo_slides';
  info: {
    displayName: 'Promo Slide';
  };
  attributes: {
    description: Schema.Attribute.Text;
    image: Schema.Attribute.Media<'images'>;
    title: Schema.Attribute.String;
  };
}

export interface BlocksSocialLink extends Struct.ComponentSchema {
  collectionName: 'components_blocks_social_links';
  info: {
    displayName: 'Social Link';
  };
  attributes: {
    icon: Schema.Attribute.String;
    name: Schema.Attribute.String;
    url: Schema.Attribute.String;
  };
}

export interface BlocksTabItem extends Struct.ComponentSchema {
  collectionName: 'components_blocks_tab_items';
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

export interface BlocksVideo extends Struct.ComponentSchema {
  collectionName: 'components_blocks_videos';
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
    url: Schema.Attribute.String;
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

export interface SharedLocation extends Struct.ComponentSchema {
  collectionName: 'components_shared_locations';
  info: {
    description: '';
    displayName: 'Location';
  };
  attributes: {
    address: Schema.Attribute.String;
    latitude: Schema.Attribute.Decimal;
    longitude: Schema.Attribute.Decimal;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    description: '';
    displayName: 'SEO';
  };
  attributes: {
    metaDescription: Schema.Attribute.Text;
    metaTitle: Schema.Attribute.String;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'blocks.accordion-item': BlocksAccordionItem;
      'blocks.advantage': BlocksAdvantage;
      'blocks.clinic': BlocksClinic;
      'blocks.contact-detail': BlocksContactDetail;
      'blocks.faq-item': BlocksFaqItem;
      'blocks.gallery-image': BlocksGalleryImage;
      'blocks.promo-slide': BlocksPromoSlide;
      'blocks.social-link': BlocksSocialLink;
      'blocks.tab-item': BlocksTabItem;
      'blocks.video': BlocksVideo;
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
      'sections.linked-resources': SectionsLinkedResources;
      'sections.promo-slider': SectionsPromoSlider;
      'sections.social-links': SectionsSocialLinks;
      'sections.tabs': SectionsTabs;
      'sections.video': SectionsVideo;
      'shared.location': SharedLocation;
      'shared.seo': SharedSeo;
    }
  }
}
