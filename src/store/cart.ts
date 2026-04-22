import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine, Product, StashType } from "@/types/shop";
import { useLocation } from "@/store/location";

const lineKey = (l: Pick<CartLine, "product" | "variantId" | "districtSlug" | "stashType"> & { isGift?: boolean }) =>
  `${l.product.id}::${l.variantId ?? ""}::${l.districtSlug ?? ""}::${l.stashType ?? ""}${l.isGift ? "::gift" : ""}`;

interface AddOptions {
  variantId?: string;
  districtSlug?: string;
  stashType?: StashType;
  priceUSD?: number;
}

export interface DisplayCartLine extends CartLine {
  isGift?: boolean;
}

export const DELIVERY_FEE_USD = 20;

interface CityCart {
  lines: CartLine[];
  delivery: boolean;
  deliveryAddress: string;
}

const emptyCart = (): CityCart => ({ lines: [], delivery: false, deliveryAddress: "" });
const activeKey = () => useLocation.getState().city ?? "__none__";

interface CartState {
  /** Корзины по городам. */
  cartsByCity: Record<string, CityCart>;
  /** Зеркало активной корзины (для удобной подписки в компонентах). */
  lines: CartLine[];
  delivery: boolean;
  deliveryAddress: string;
  setDeliveryAddress: (v: string) => void;
  setDelivery: (v: boolean) => void;
  toggleDelivery: () => void;
  add: (product: Product, opts?: AddOptions) => void;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
  totalQty: () => number;
  subtotalUSD: () => number;
  totalTHB: () => number;
  linesWithGifts: () => DisplayCartLine[];
  /** Пересинхронизировать зеркало с активным городом (вызывается при смене локации). */
  _syncMirror: () => void;
}

const find5gVariant = (product: Product) =>
  product.variants?.find((v) => v.id === "5g" || v.grams === 5);

/** Apply updater to active city's cart and return new state slice (incl. mirror). */
const applyToActive = (
  state: CartState,
  updater: (cart: CityCart) => CityCart
) => {
  const key = activeKey();
  const current = state.cartsByCity[key] ?? emptyCart();
  const next = updater(current);
  return {
    cartsByCity: { ...state.cartsByCity, [key]: next },
    lines: next.lines,
    delivery: next.delivery,
    deliveryAddress: next.deliveryAddress,
  };
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      cartsByCity: {},
      lines: [],
      delivery: false,
      deliveryAddress: "",
      _syncMirror: () => {
        const key = activeKey();
        const c = get().cartsByCity[key] ?? emptyCart();
        set({ lines: c.lines, delivery: c.delivery, deliveryAddress: c.deliveryAddress });
      },
      setDeliveryAddress: (v) =>
        set((s) => applyToActive(s, (c) => ({ ...c, deliveryAddress: v }))),
      setDelivery: (v) =>
        set((s) => applyToActive(s, (c) => ({ ...c, delivery: v }))),
      toggleDelivery: () =>
        set((s) => applyToActive(s, (c) => ({ ...c, delivery: !c.delivery }))),
      add: (product, opts) =>
        set((s) =>
          applyToActive(s, (c) => {
            const candidate: CartLine = {
              product,
              qty: 1,
              variantId: opts?.variantId,
              districtSlug: opts?.districtSlug,
              stashType: opts?.stashType,
              priceUSD: opts?.priceUSD,
            };
            const key = lineKey(candidate);
            const existing = c.lines.find((l) => lineKey(l) === key);
            if (existing) {
              return {
                ...c,
                lines: c.lines.map((l) =>
                  lineKey(l) === key ? { ...l, qty: l.qty + 1 } : l
                ),
              };
            }
            return { ...c, lines: [...c.lines, candidate] };
          })
        ),
      remove: (key) =>
        set((s) =>
          applyToActive(s, (c) => {
            const lines = c.lines.filter((l) => lineKey(l) !== key);
            return lines.length === 0
              ? { lines, delivery: false, deliveryAddress: "" }
              : { ...c, lines };
          })
        ),
      setQty: (key, qty) =>
        set((s) =>
          applyToActive(s, (c) => ({
            ...c,
            lines:
              qty <= 0
                ? c.lines.filter((l) => lineKey(l) !== key)
                : c.lines.map((l) => (lineKey(l) === key ? { ...l, qty } : l)),
          }))
        ),
      clear: () => set((s) => applyToActive(s, () => emptyCart())),
      totalQty: () => get().lines.reduce((s, l) => s + l.qty, 0),
      subtotalUSD: () =>
        get().lines.reduce(
          (s, l) => s + l.qty * (l.priceUSD ?? l.product.priceTHB ?? 0),
          0
        ),
      totalTHB: () => {
        const sub = get().lines.reduce(
          (s, l) => s + l.qty * (l.priceUSD ?? l.product.priceTHB ?? 0),
          0
        );
        return sub + (get().delivery ? DELIVERY_FEE_USD : 0);
      },
      linesWithGifts: () => {
        const out: DisplayCartLine[] = [];
        for (const l of get().lines) {
          out.push(l);
          const variant = l.product.variants?.find((v) => v.id === l.variantId);
          const grams = variant?.grams ?? 0;
          if (grams >= 5) {
            const giftVariant = find5gVariant(l.product);
            if (giftVariant) {
              out.push({
                product: l.product,
                qty: l.qty,
                variantId: giftVariant.id,
                districtSlug: l.districtSlug,
                stashType: l.stashType,
                priceUSD: 0,
                isGift: true,
              });
            }
          }
        }
        return out;
      },
    }),
    {
      name: "sweetleaf-cart-v2",
      onRehydrateStorage: () => (state) => {
        state?._syncMirror();
      },
    }
  )
);

// При смене города/страны — переключаем активную корзину.
useLocation.subscribe((s, prev) => {
  if (s.city !== prev.city) {
    useCart.getState()._syncMirror();
  }
});

export { lineKey };
