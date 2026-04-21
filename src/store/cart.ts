import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine, Product, StashType } from "@/types/shop";

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

interface CartState {
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
  /** Сумма товаров без доставки */
  subtotalUSD: () => number;
  /** Итог с учётом доставки */
  totalTHB: () => number;
  linesWithGifts: () => DisplayCartLine[];
}

/** Find a 5g variant on the product (by id "5g" or grams===5). */
const find5gVariant = (product: Product) =>
  product.variants?.find((v) => v.id === "5g" || v.grams === 5);

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      delivery: false,
      setDelivery: (v) => set({ delivery: v }),
      toggleDelivery: () => set((s) => ({ delivery: !s.delivery })),
      add: (product, opts) =>
        set((state) => {
          const candidate: CartLine = {
            product,
            qty: 1,
            variantId: opts?.variantId,
            districtSlug: opts?.districtSlug,
            stashType: opts?.stashType,
            priceUSD: opts?.priceUSD,
          };
          const key = lineKey(candidate);
          const existing = state.lines.find((l) => lineKey(l) === key);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                lineKey(l) === key ? { ...l, qty: l.qty + 1 } : l
              ),
            };
          }
          return { lines: [...state.lines, candidate] };
        }),
      remove: (key) =>
        set((state) => {
          const lines = state.lines.filter((l) => lineKey(l) !== key);
          // Если корзина опустела — сбрасываем доставку
          return lines.length === 0 ? { lines, delivery: false } : { lines };
        }),
      setQty: (key, qty) =>
        set((state) => ({
          lines:
            qty <= 0
              ? state.lines.filter((l) => lineKey(l) !== key)
              : state.lines.map((l) => (lineKey(l) === key ? { ...l, qty } : l)),
        })),
      clear: () => set({ lines: [], delivery: false }),
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
    { name: "sweetleaf-cart" }
  )
);

export { lineKey };
