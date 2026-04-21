export type CountrySlug = "thailand" | "vietnam" | "bali" | "kl";

export interface City {
  slug: string;
  name: { ru: string; en: string };
}

export interface Country {
  slug: CountrySlug;
  flag: string;
  name: { ru: string; en: string };
  cities: City[];
  /** Local currency settings. Prices are stored in THB and converted at render time. */
  currency: {
    code: string;       // ISO-like, e.g. "THB", "IDR", "VND", "MYR"
    symbol: string;     // displayed symbol, e.g. "฿", "Rp", "₫", "RM"
    /** How many local units = 1 THB */
    perTHB: number;
    /** Round price to nearest N units in local currency. */
    roundTo?: number;
  };
}

export const COUNTRIES: Country[] = [
  {
    slug: "thailand",
    flag: "🇹🇭",
    name: { ru: "Тайланд", en: "Thailand" },
    cities: [
      { slug: "phuket", name: { ru: "Пхукет", en: "Phuket" } },
      { slug: "bangkok", name: { ru: "Бангкок", en: "Bangkok" } },
      { slug: "pattaya", name: { ru: "Паттайя", en: "Pattaya" } },
      { slug: "samui", name: { ru: "Самуи", en: "Samui" } },
    ],
  },
  {
    slug: "vietnam",
    flag: "🇻🇳",
    name: { ru: "Вьетнам", en: "Vietnam" },
    cities: [
      { slug: "hochiminh", name: { ru: "Хошимин", en: "Ho Chi Minh" } },
      { slug: "danang", name: { ru: "Дананг", en: "Da Nang" } },
      { slug: "nhatrang", name: { ru: "Нячанг", en: "Nha Trang" } },
    ],
  },
  {
    slug: "bali",
    flag: "🇮🇩",
    name: { ru: "Бали", en: "Bali" },
    cities: [{ slug: "bali", name: { ru: "Бали", en: "Bali" } }],
  },
  {
    slug: "kl",
    flag: "🇲🇾",
    name: { ru: "Куала-Лумпур", en: "Kuala Lumpur" },
    cities: [{ slug: "kl", name: { ru: "Куала-Лумпур", en: "Kuala Lumpur" } }],
  },
];

export const findCity = (citySlug: string) => {
  for (const c of COUNTRIES) {
    const city = c.cities.find((x) => x.slug === citySlug);
    if (city) return { country: c, city };
  }
  return null;
};
