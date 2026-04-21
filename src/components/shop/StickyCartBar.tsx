import { useCart } from "@/store/cart";
import { formatTHB } from "@/lib/format";
import { haptic } from "@/lib/telegram";
import { ShoppingBag } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface StickyCartBarProps {
  onClick: () => void;
}

export const StickyCartBar = ({ onClick }: StickyCartBarProps) => {
  const totalQty = useCart((s) => s.totalQty());
  const total = useCart((s) => s.totalTHB());
  const lang = useI18n((s) => s.lang) ?? "ru";

  if (totalQty === 0) return null;

  const label =
    lang === "ru"
      ? `${totalQty} ${totalQty === 1 ? "товар" : totalQty < 5 ? "товара" : "товаров"}`
      : `${totalQty} ${totalQty === 1 ? "item" : "items"}`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto animate-slide-up">
        <button
          onClick={() => {
            haptic("medium");
            onClick();
          }}
          className="w-full gradient-primary text-primary-foreground font-semibold py-4 px-5 rounded-2xl flex items-center justify-between shadow-glow active:scale-[0.98] transition-[var(--transition-base)]"
        >
          <span className="flex items-center gap-2.5">
            <span className="bg-primary-foreground/20 backdrop-blur w-7 h-7 rounded-full flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </span>
            <span>{label}</span>
          </span>
          <span className="font-bold">{formatTHB(total)} →</span>
        </button>
      </div>
    </div>
  );
};
