import type { Category, Product, ProductVariant, VariantStash, StashType } from "@/types/shop";
import { COUNTRIES } from "./locations";

export const CATEGORIES: Category[] = [
  { slug: "gummies", name: { ru: "Жевательное", en: "Gummies" }, emoji: "🍬", gradient: "gradient-grape" },
  { slug: "chocolate", name: { ru: "Шоколад", en: "Chocolate" }, emoji: "🍫", gradient: "gradient-mango" },
  { slug: "cookies", name: { ru: "Печенье", en: "Cookies" }, emoji: "🍪", gradient: "gradient-mango" },
  { slug: "drinks", name: { ru: "Напитки", en: "Drinks" }, emoji: "🥤", gradient: "gradient-mint" },
  { slug: "vapes", name: { ru: "Вейпы", en: "Vapes" }, emoji: "💨", gradient: "gradient-grape" },
];

const buildDemoVariants = (cities: string[], basePrice: number): ProductVariant[] => {
  const countryPriceFactor: Record<string, number> = {
    thailand: 1,
    vietnam: 0.85,
    bali: 1.1,
    kl: 1.2,
  };

  const countriesUsed = new Set<string>();
  const districtsByCity = new Map<string, string[]>();
  for (const country of COUNTRIES) {
    for (const city of country.cities) {
      if (!cities.includes(city.slug)) continue;
      countriesUsed.add(country.slug);
      const ds = (city.districts ?? []).slice(0, 2).map((d) => d.slug);
      districtsByCity.set(city.slug, ds);
    }
  }

  const allDistricts = Array.from(districtsByCity.values()).flat();
  const firstDistricts = Array.from(districtsByCity.values())
    .map((ds) => ds[0])
    .filter(Boolean);

  const types: StashType[] = ["prikop", "klad", "magnit"];
  const grams = [1, 2, 5];
  return grams.map((g, idx) => {
    const pricesByCountry: Record<string, number> = {};
    for (const c of countriesUsed) {
      const factor = countryPriceFactor[c] ?? 1;
      pricesByCountry[c] = Math.round(basePrice * g * factor * (1 - idx * 0.05));
    }
    const districts = g === 1 ? allDistricts : firstDistricts;
    const stashes: VariantStash[] = districts.map((d, i) => ({
      districtSlug: d,
      type: types[i % types.length],
    }));
    return {
      id: `${g}g`,
      grams: g,
      pricesByCountry,
      stashes,
    };
  });
};

const make = (p: Omit<Product, "variants"> & { basePrice?: number }): Product => ({
  ...p,
  variants: buildDemoVariants(p.cities ?? [], p.basePrice ?? 10),
});

export const PRODUCTS: Product[] = [
  make({
    id: "p1",
    name: { ru: "Mango Sticky Rice Gummies", en: "Mango Sticky Rice Gummies" },
    description: {
      ru: "Тайская классика в желейном формате. Сочный манго и сладкий рис.",
      en: "Thai classic in gummy form. Juicy mango and sweet rice.",
    },
    category: "gummies",
    priceTHB: 450,
    weight: "10 шт",
    inStock: 24,
    gradient: "gradient-mango",
    emoji: "🥭",
    featured: true,
    badge: { ru: "Хит", en: "Hit" },
    cities: ["phuket", "bangkok", "pattaya", "samui"],
    basePrice: 12,
  }),
  make({
    id: "p2",
    name: { ru: "Strawberry Cloud Gummies", en: "Strawberry Cloud Gummies" },
    description: {
      ru: "Воздушные мармеладки с натуральной клубникой.",
      en: "Airy gummies with real strawberry.",
    },
    category: "gummies",
    priceTHB: 420,
    weight: "10 шт",
    inStock: 18,
    gradient: "gradient-grape",
    emoji: "🍓",
    cities: ["phuket", "bangkok", "bali"],
    basePrice: 11,
  }),
  make({
    id: "p3",
    name: { ru: "Dark Chocolate Bar", en: "Dark Chocolate Bar" },
    description: {
      ru: "Бельгийский тёмный шоколад 70% с лёгкой ноткой мяты.",
      en: "Belgian 70% dark chocolate with a hint of mint.",
    },
    category: "chocolate",
    priceTHB: 320,
    weight: "50 г",
    inStock: 30,
    gradient: "gradient-mango",
    emoji: "🍫",
    cities: ["phuket", "bangkok", "pattaya", "samui", "bali", "kl"],
    basePrice: 9,
  }),
  make({
    id: "p4",
    name: { ru: "Coconut Choco Bites", en: "Coconut Choco Bites" },
    description: {
      ru: "Хрустящие шарики с кокосом в молочном шоколаде.",
      en: "Crunchy coconut balls in milk chocolate.",
    },
    category: "chocolate",
    priceTHB: 380,
    weight: "8 шт",
    inStock: 12,
    gradient: "gradient-mint",
    emoji: "🥥",
    badge: { ru: "Новинка", en: "New" },
    cities: ["bali", "phuket"],
    basePrice: 10,
  }),
  make({
    id: "p5",
    name: { ru: "Pineapple Cookies", en: "Pineapple Cookies" },
    description: {
      ru: "Мягкое печенье с кусочками тайского ананаса.",
      en: "Soft cookies with chunks of Thai pineapple.",
    },
    category: "cookies",
    priceTHB: 290,
    weight: "6 шт",
    inStock: 20,
    gradient: "gradient-mango",
    emoji: "🍍",
    cities: ["bangkok", "phuket", "samui"],
    basePrice: 8,
  }),
  make({
    id: "p6",
    name: { ru: "Lychee Iced Tea", en: "Lychee Iced Tea" },
    description: {
      ru: "Холодный чай с личи и лёгким эффектом расслабления.",
      en: "Cold lychee tea with a light relaxing effect.",
    },
    category: "drinks",
    priceTHB: 250,
    weight: "330 мл",
    inStock: 15,
    gradient: "gradient-mint",
    emoji: "🧋",
    cities: ["hochiminh", "danang", "nhatrang", "bangkok"],
    basePrice: 7,
  }),
  make({
    id: "p7",
    name: { ru: "Mint Mojito Vape", en: "Mint Mojito Vape" },
    description: {
      ru: "Одноразовый вейп со вкусом мяты и лайма.",
      en: "Disposable vape with mint and lime flavor.",
    },
    category: "vapes",
    priceTHB: 850,
    weight: "1 мл",
    inStock: 8,
    gradient: "gradient-mint",
    emoji: "💨",
    cities: ["phuket", "bangkok", "pattaya", "kl"],
    basePrice: 25,
  }),
  make({
    id: "p8",
    name: { ru: "Berry Bliss Cookies", en: "Berry Bliss Cookies" },
    description: {
      ru: "Печенье с микс-ягодами и белым шоколадом.",
      en: "Cookies with mixed berries and white chocolate.",
    },
    category: "cookies",
    priceTHB: 310,
    weight: "6 шт",
    inStock: 14,
    gradient: "gradient-grape",
    emoji: "🫐",
    cities: ["bali", "kl", "hochiminh"],
    basePrice: 8,
  }),
];
