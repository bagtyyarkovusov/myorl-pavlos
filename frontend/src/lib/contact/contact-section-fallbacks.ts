import type { ContactClinicDTO, ContactDetailDTO, Locale, SectionDTO } from "@/lib/cms/types";

type ContactSection = Extract<SectionDTO, { __component: "sections.contact" }>;

const FALLBACK_DETAILS: Record<Locale, ContactDetailDTO[]> = {
  el: [
    {
      type: "Διεύθυνση",
      valueHtml: "<p>Λεωφόρος Αλεξάνδρας 201<br>Αθήνα, Μετρό Αμπελόκηποι</p>",
    },
    {
      type: "Τηλέφωνα",
      valueHtml:
        '<p>Σταθερό: <a href="tel:+302110194618">211-0194 618</a><br>Κινητό: <a href="tel:+306945773077">6945-77 30 77</a></p>',
    },
    {
      type: "Email",
      valueHtml:
        '<p><a href="mailto:pavlos.tsolaridis@gmail.com">pavlos.tsolaridis@gmail.com</a></p>',
    },
  ],
  ru: [
    {
      type: "Адрес",
      valueHtml: "<p>Леофорос Alexandras 201<br>Афины, метро Амбелокипи</p>",
    },
    {
      type: "Телефоны",
      valueHtml:
        '<p>тел: <a href="tel:+302110194618">211-0194 618</a><br>моб: <a href="tel:+306945773077">6945-77 30 77</a></p>',
    },
    {
      type: "E-mail",
      valueHtml:
        '<p><a href="mailto:pavlos.tsolaridis@gmail.com">pavlos.tsolaridis@gmail.com</a></p>',
    },
  ],
};

const FALLBACK_CLINICS: Record<Locale, ContactClinicDTO[]> = {
  el: [
    {
      name: "Λεωφόρος Αλεξάνδρας 201",
      addressHtml:
        "<p><strong>Λεωφόρος Αλεξάνδρας 201, Αθήνα</strong></p><p><strong>Μετακίνηση:</strong> Λεωφορεία 070, 230, A7, B5, 653, 610, 046, 813 · Τρόλεϊ 14, 18, 19 · Μετρό Αμπελόκηποι (Γραμμή 3)</p>",
      phone: "211-0194 618",
      email: "pavlos.tsolaridis@gmail.com",
      latitude: 37.9874025,
      longitude: 23.7580312,
    },
    {
      name: "Βεηκου 78, Κουκάκι",
      addressHtml:
        "<p><strong>Βεηκου 78, Κουκάκι, Αθήνα</strong></p><p><strong>Μετακίνηση:</strong> Τρόλεϊ 1, 5, 15 (στ. «Κουκάκι» / «Ζήννη») · Τραμ Fix · Λεωφορεία A2, B2, 040, 106, 126, 134–137, 550, Ε2 · Μετρό «Συγγρού Fix»</p>",
      phone: null,
      email: null,
      latitude: 37.963975,
      longitude: 23.7221067,
    },
    {
      name: "Μαραθωνος 1",
      addressHtml:
        "<p><strong>Μαραθωνος 1, Αθήνα</strong></p><p><strong>Μετακίνηση:</strong> Τρόλεϊ Α16, Γ16, Β18, Γ18 · Λεωφορεία 025–027, 049, 815, 838, 856, 914, 227 · Μετρό «Ομόνοια» / Κεραμεικός</p>",
      phone: null,
      email: null,
      latitude: 37.9812629,
      longitude: 23.7195419,
    },
  ],
  ru: [
    {
      name: "Леофорос Alexandras 201",
      addressHtml:
        "<p><strong>Леофорос Alexandras 201, Афины</strong></p><p><strong>Как доехать:</strong> Автобусы 070, 230, A7, B5, 653, 610, 046, 813 · Троллейбус 14, 18, 19 · Метро Амбелокипи (синяя линия)</p>",
      phone: "211-0194 618",
      email: "pavlos.tsolaridis@gmail.com",
      latitude: 37.9874025,
      longitude: 23.7580312,
    },
    {
      name: "Veikou 78, Koukaki",
      addressHtml:
        "<p><strong>Veikou 78, Koukaki, Афины</strong></p><p><strong>Как доехать:</strong> Троллейбус 1, 5, 15 (остановки «Koukaki» / «Zinni») · Трамвай Fix · Автобусы A2, B2, 040, 106, 126, 134–137, 550, E2 · Метро «Syngrou Fix»</p>",
      phone: null,
      email: null,
      latitude: 37.963975,
      longitude: 23.7221067,
    },
    {
      name: "Marathonos 1",
      addressHtml:
        "<p><strong>Marathonos 1, Афины</strong></p><p><strong>Как доехать:</strong> Троллейбус A16, C16, B18, C18 · Автобусы 025–027, 049, 815, 838, 856, 914, 227 · Метро «Omonia» / Kerameikos</p>",
      phone: null,
      email: null,
      latitude: 37.9812629,
      longitude: 23.7195419,
    },
  ],
};

export function getFallbackContactSection(locale: Locale): ContactSection {
  return {
    __component: "sections.contact",
    heading: null,
    intro: null,
    details: FALLBACK_DETAILS[locale],
    clinics: FALLBACK_CLINICS[locale],
  };
}

export function resolveContactSection(
  page: { sections: SectionDTO[] },
  locale: Locale,
): ContactSection {
  const section = page.sections.find((entry) => entry.__component === "sections.contact");
  if (section?.__component === "sections.contact") {
    const hasStructuredData = section.details.length > 0 || section.clinics.length > 0;
    if (hasStructuredData) {
      return section;
    }
  }
  return getFallbackContactSection(locale);
}
