// ============================================================
// 🔐 Тонкая обёртка над session — для обратной совместимости с UI.
// Реальная авторизация: src/store/session.ts (через Telegram initData).
// Whitelist админов теперь живёт на бэке (ADMIN_TG_IDS в .env).
// ============================================================
import { useSession } from "./session";

export const useAuth = () => {
  const user = useSession((s) => s.user);
  const logout = useSession((s) => s.logout);
  return {
    isAdmin: !!user?.isAdmin,
    /** Заглушка для совместимости со старым кодом. Реальный вход — через session.loginWithInitData. */
    loginWithTelegram: (_tgId?: number | null) => !!user?.isAdmin,
    logout,
  };
};
