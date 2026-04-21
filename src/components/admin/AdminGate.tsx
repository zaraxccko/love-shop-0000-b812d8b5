import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { useAuth } from "@/store/auth";
import { useTelegram } from "@/lib/telegram";
import { useT } from "@/lib/i18n";

interface Props {
  children: ReactNode;
}

const AdminGate = ({ children }: Props) => {
  const t = useT();
  const { isAdmin, loginWithTelegram, logout } = useAuth();
  const { user, isInTelegram } = useTelegram();

  // Auto-login via Telegram ID if it's whitelisted
  useEffect(() => {
    if (!isAdmin && user?.id) {
      loginWithTelegram(user.id);
    }
  }, [user?.id, isAdmin, loginWithTelegram]);

  if (isAdmin) {
    return (
      <div className="relative">
        <button
          onClick={logout}
          className="fixed bottom-4 right-4 z-50 text-[11px] px-3 py-1.5 rounded-full bg-muted text-muted-foreground active:scale-95 shadow-card"
        >
          {t("admin.logout")}
        </button>
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-md mx-auto bg-background flex flex-col">
      <header className="px-5 pt-5 pb-3">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground active:scale-95">
          <ArrowLeft className="w-4 h-4" /> {t("admin.back")}
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-5">
        <div className="w-full bg-card rounded-3xl p-6 shadow-card space-y-4">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-destructive/10">
              <ShieldAlert className="w-6 h-6 text-destructive" />
            </div>
            <h1 className="font-display font-bold text-xl">
              {t("admin.deniedTitle")}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isInTelegram
                ? t("admin.deniedTgSub")
                : t("admin.deniedNoTgSub")}
            </p>
            {user?.id && (
              <p className="text-[11px] text-muted-foreground mt-2">
                Telegram ID: <span className="font-mono font-bold">{user.id}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminGate;
