// ============================================================
// 🛍️ Каталог — теперь грузится с бэкенда.
// localStorage используется только как кэш для мгновенного показа.
// ============================================================
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Category, Product } from "@/types/shop";
import { CATEGORIES as DEFAULT_CATEGORIES, PRODUCTS as DEFAULT_PRODUCTS } from "@/data/mockProducts";
import { Catalog, Admin } from "@/lib/api";

interface CatalogState {
  categories: Category[];
  products: Product[];
  loading: boolean;
  loaded: boolean;

  /** Подгрузить с сервера. Безопасно вызывать многократно. */
  hydrate: () => Promise<void>;

  setCategories: (c: Category[]) => void;
  setProducts: (p: Product[]) => void;

  upsertProduct: (p: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  upsertCategory: (c: Category) => void;
  deleteCategory: (slug: string) => void;
  reset: () => void;
}

export const useCatalog = create<CatalogState>()(
  persist(
    (set, get) => ({
      categories: DEFAULT_CATEGORIES,
      products: DEFAULT_PRODUCTS,
      loading: false,
      loaded: false,

      hydrate: async () => {
        if (get().loading) return;
        set({ loading: true });
        try {
          const products = await Catalog.list();
          // категории на бэке — массив строковых slug. Совмещаем с локальными
          // дефолтами, чтобы сохранить emoji/gradient/локализованные имена.
          set({
            products: products as Product[],
            loaded: true,
            loading: false,
          });
        } catch {
          set({ loading: false });
        }
      },

      setCategories: (categories) => set({ categories }),
      setProducts: (products) => set({ products }),

      upsertProduct: async (p) => {
        const exists = get().products.some((x) => x.id === p.id);
        // Маппинг variants под бэкенд (slug вместо id).
        const payload = {
          name: p.name,
          description: p.description,
          category: p.category,
          priceTHB: p.priceTHB,
          thcMg: p.thcMg,
          cbdMg: p.cbdMg,
          weight: p.weight,
          inStock: p.inStock,
          gradient: p.gradient,
          emoji: p.emoji,
          imageUrl: p.imageUrl,
          featured: p.featured,
          badge: p.badge,
          cities: p.cities,
          districts: p.districts,
          variants: (p.variants ?? []).map((v) => ({
            slug: v.id,
            grams: v.grams,
            pricesByCountry: v.pricesByCountry,
            stashes: v.stashes,
            districts: v.districts,
          })),
        };
        const saved = exists
          ? await Admin.updateProduct(p.id, payload)
          : await Admin.createProduct(payload);
        await get().hydrate();
        return saved as any;
      },

      deleteProduct: async (id) => {
        await Admin.deleteProduct(id);
        set((s) => ({ products: s.products.filter((p) => p.id !== id) }));
      },

      upsertCategory: (c) =>
        set((s) => {
          const exists = s.categories.some((x) => x.slug === c.slug);
          return {
            categories: exists
              ? s.categories.map((x) => (x.slug === c.slug ? c : x))
              : [...s.categories, c],
          };
        }),
      deleteCategory: (slug) =>
        set((s) => ({ categories: s.categories.filter((c) => c.slug !== slug) })),
      reset: () => set({ categories: DEFAULT_CATEGORIES, products: DEFAULT_PRODUCTS, loaded: false }),
    }),
    {
      name: "loveshop-catalog-v5",
      partialize: (s) => ({ categories: s.categories, products: s.products }),
      // Защита от повреждённого/устаревшего кэша.
      merge: (persisted: any, current) => {
        const safe = (v: any, fallback: any[]) => (Array.isArray(v) ? v : fallback);
        return {
          ...current,
          ...(persisted ?? {}),
          products: safe(persisted?.products, DEFAULT_PRODUCTS),
          categories: safe(persisted?.categories, DEFAULT_CATEGORIES),
        };
      },
    }
  )
);
