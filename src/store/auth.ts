import { create } from "zustand";
import { persist } from "zustand/middleware";

// ============================================================
// 🔐 ДОСТУП В АДМИНКУ
// ============================================================
//
// Вход в админку разрешён ТОЛЬКО пользователям, чей Telegram ID
// указан в списке ниже. Никаких паролей — только whitelist.
//
// Узнать свой Telegram ID можно у бота @userinfobot.
//
// Добавляйте свои ID через запятую:
//   const ADMIN_TELEGRAM_IDS: number[] = [123456789, 987654321];
//
const ADMIN_TELEGRAM_IDS: number[] = [
  8044243116, // основной админ
  8132405868, // второй админ
];

// ============================================================

interface AuthState {
  isAdmin: boolean;
  loginWithTelegram: (tgUserId?: number | null) => boolean;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      isAdmin: false,
      loginWithTelegram: (tgUserId) => {
        if (tgUserId && ADMIN_TELEGRAM_IDS.includes(tgUserId)) {
          set({ isAdmin: true });
          return true;
        }
        return false;
      },
      logout: () => set({ isAdmin: false }),
    }),
    { name: "loveshop-auth" }
  )
);
