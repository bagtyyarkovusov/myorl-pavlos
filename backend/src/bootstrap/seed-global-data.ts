export type SeedLocale = "el" | "ru";

export type SeedSocialLink = {
  name: string;
  url: string;
};

export type SeedPrimaryContact = {
  address: string;
  phoneTel: string;
  phoneDisplay: string;
  secondaryPhoneTel: string;
  secondaryPhoneDisplay: string;
  email: string;
  hours: string;
};

/** Canonical shared social links (non-localized). Greek homepage set. */
export const SEED_SOCIAL_LINKS: SeedSocialLink[] = [
  {
    name: "Facebook",
    url: "https://www.facebook.com/orlathens/",
  },
  {
    name: "YouTube",
    url: "https://www.youtube.com/user/OrlAthens/videos",
  },
  {
    name: "Instagram",
    url: "https://www.instagram.com/myorl.gr/",
  },
  {
    name: "Google",
    url: "https://www.google.gr/search?newwindow=1&source=hp&ei=1qigXOlUwqeuBLSOn7AG&q=%CF%89%CF%81%CE%BB%20%CE%B1%CE%B8%CE%B7%CE%BD%CE%B1&oq=%CF%89%CF%81%CE%BB+%CE%B1&gs_l=psy-ab.1.0.0l10.3218.4564..6536...0.0..0.253.1089.1j4j2......0....1..gws-wiz.....0..0i131.QSZaY-bx0rw&npsic=0&rflfq=1&rlha=0&rllag=37983315,23738826,1742&tbm=lcl&rldimm=15671721623596932737&ved=2ahUKEwjN-rnFp6zhAhV9ysQBHUHYAI4QvS4wAXoECAkQIQ&rldoc=1&tbs=lrf:!2m1!1e2!2m1!1e3!3sIAE,lf:1,lf_ui:2#lrd=0x14a1a2ab52ac0da9:0xd97d23c8c94d9e81,1,,,&rlfi=hd:;si:15671721623596932737;mv:!1m2!1d38.0012241!2d23.766274199999998!2m2!1d37.9622964!2d23.713051699999998;tbs:lrf:!2m1!1e2!2m1!1e3!3sIAE,lf:1,lf_ui:2",
  },
];

export const SEED_PRIMARY_CONTACT: Record<SeedLocale, SeedPrimaryContact> = {
  el: {
    address: "Λεωφόρος Αλεξάνδρας 201 & Πανόρμου, Αμπελόκηποι, Αθήνα",
    phoneTel: "+302110194618",
    phoneDisplay: "211-01 94 618",
    secondaryPhoneTel: "+306945773077",
    secondaryPhoneDisplay: "6945 77 30 77",
    email: "pavlos.tsolaridis@gmail.com",
    hours: "Δευ–Παρ · 09:00 – 21:00\nΣάβ · 10:00 – 14:00",
  },
  ru: {
    address: "Проспект Alexandras 201 & Panormou, Амбелокипи, Афины",
    phoneTel: "+302110194618",
    phoneDisplay: "211-01 94 618",
    secondaryPhoneTel: "+306945773077",
    secondaryPhoneDisplay: "6945 77 30 77",
    email: "pavlos.tsolaridis@gmail.com",
    hours: "Пн–Пт · 09:00 – 21:00\nСб · 10:00 – 14:00",
  },
};
