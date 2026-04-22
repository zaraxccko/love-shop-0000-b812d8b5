// ============================================================
// 🔐 Тонкая обёртка над session — для обратной совместимости с UI.
// Реальная авторизация: src/store/session.ts (через Telegram initData).
// Админы определяются двумя путями:
//   1) Серверный флаг user.isAdmin (бэк сверяет с ADMIN_TG_IDS в .env).
//   2) Локальный fallback по VITE_ADMIN_IDS (comma-separated TG IDs) —
//      нужен на случай, когда бэк ещё не присвоил флаг или фронт
//      работает с превью без авторизации.
// ============================================================
import { useSession } from "./session";
import { useTelegram } from "@/lib/telegram";

function getAdminIdsFromEnv(): string[] {
  const raw = (import.meta.env.VITE_ADMIN_IDS as string | undefined) ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const useAuth = () => {
  const user = useSession((s) => s.user);
  const logout = useSession((s) => s.logout);
  const { user: tgUser } = useTelegram();

  const adminIds = getAdminIdsFromEnv();
  // Сравниваем как строки — ID Telegram могут приходить и числом, и строкой.
  const tgIdStr = tgUser?.id != null ? String(tgUser.id) : user?.tgId ? String(user.tgId) : null;
  const isAdminByEnv = !!tgIdStr && adminIds.includes(tgIdStr);
  const isAdmin = !!user?.isAdmin || isAdminByEnv;

  return {
    isAdmin,
    /** Заглушка для совместимости со старым кодом. Реальный вход — через session.loginWithInitData. */
    loginWithTelegram: (_tgId?: number | null) => isAdmin,
    logout,
  };
};
