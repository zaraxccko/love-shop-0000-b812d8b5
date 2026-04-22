import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Подписка на Telegram-канал — обязательное условие входа в магазин.
 *
 * Реальная проверка делается ботом на VPS (метод getChatMember).
 * Здесь — клиентская заглушка, которую при подключении бэка
 * нужно заменить вызовом /api/check-subscription.
 */

/** ⚠️ Поменяйте на свой канал. Без `@`. */
export const REQUIRED_CHANNEL = {
  username: "loveshop",
  title: "Наш канал",
  url: "https://t.me/+jmzWeg8Pxkk3ODE1",
};

interface SubscriptionState {
  subscribed: boolean;
  forceGatePreview: boolean;
  lastCheckedAt: number | null;
  /** Имитация запроса к боту. true = подписан. */
  check: () => Promise<boolean>;
  /** Используется в DEV / для отладки. */
  setSubscribed: (v: boolean) => void;
  setForceGatePreview: (v: boolean) => void;
}

export const useSubscription = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      subscribed: false,
      forceGatePreview: false,
      lastCheckedAt: null,
      check: async () => {
        // TODO: заменить на fetch('/api/check-subscription', { tgId })
        await new Promise((r) => setTimeout(r, 700));
        // Мок: 70% вероятность что юзер подписался.
        const ok = Math.random() < 0.7;
        set({ subscribed: ok, forceGatePreview: !ok, lastCheckedAt: Date.now() });
        return ok;
      },
      setSubscribed: (v) => set({ subscribed: v, forceGatePreview: !v, lastCheckedAt: Date.now() }),
      setForceGatePreview: (v) => set({ forceGatePreview: v }),
    }),
    { name: "loveshop-subscription" }
  )
);
