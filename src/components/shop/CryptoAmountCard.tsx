import { Copy } from "lucide-react";
import { toast } from "sonner";
import { haptic } from "@/lib/telegram";
import { useI18n } from "@/lib/i18n";
import { useCryptoRates, convertUSDToCrypto, formatCryptoAmount } from "@/lib/cryptoRates";
import type { CryptoCode } from "@/store/account";

interface Props {
  amountUSD: number;
  crypto: CryptoCode;
  cryptoName: string;
}

/** Карточка с суммой к оплате в выбранной крипте + кнопка скопировать. */
export const CryptoAmountCard = ({ amountUSD, crypto, cryptoName }: Props) => {
  const lang = useI18n((s) => s.lang) ?? "ru";
  const tr = (ru: string, en: string) => (lang === "ru" ? ru : en);
  const { rates, loading } = useCryptoRates();
  const value = convertUSDToCrypto(amountUSD, crypto, rates);
  const display = value != null ? formatCryptoAmount(value, crypto) : "—";

  const copy = async () => {
    if (value == null) return;
    try {
      await navigator.clipboard.writeText(display);
      haptic("success");
      toast.success(tr("Скопировано", "Copied"));
    } catch {
      toast.error(tr("Не удалось скопировать", "Copy failed"));
    }
  };

  return (
    <div className="rounded-2xl bg-card shadow-card p-4">
      <div className="text-xs text-muted-foreground mb-1">
        {tr("Сумма к оплате", "Amount to pay")} · {cryptoName}
      </div>
      <div className="font-display font-bold text-2xl break-all">
        {loading && value == null ? tr("Загружаем курс…", "Loading rate…") : `${display} ${crypto}`}
      </div>
      <button
        onClick={copy}
        disabled={value == null}
        className="mt-3 w-full flex items-center justify-center gap-2 bg-background border border-border rounded-xl py-2.5 text-sm font-bold active:scale-[0.98] disabled:opacity-50"
      >
        <Copy className="w-4 h-4" />
        {tr("Скопировать сумму", "Copy amount")}
      </button>
    </div>
  );
};
