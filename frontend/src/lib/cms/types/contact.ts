export type ContactDetailDTO = {
  type: string;
  valueHtml: string;
};

export type ContactClinicDTO = {
  name: string;
  addressHtml: string;
  phone?: string | null;
  email?: string | null;
};

export type StrapiContactDetail = {
  type?: string | null;
  value?: string | null;
};

export type StrapiClinic = {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};
