import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Lock, ShieldAlert } from "lucide-react";
import { useAuth, MAX_ATTEMPTS } from "@/store/auth";
import { useTelegram } from "@/lib/telegram";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  children: ReactNode;
}

const formatMs = (ms: number) => {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const AdminGate = ({ children }: Props) => {
  const t = useT();
  const { isAdmin, loginWithPassword, loginWithTelegram, logout, failedAttempts, lockedUntil } = useAuth();
  const { user } = useTelegram();
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Tick every second while locked
  useEffect(() => {
    if (!lockedUntil || lockedUntil <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

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

  const remaining = lockedUntil ? Math.max(0, lockedUntil - now) : 0;
  const isLocked = remaining > 0;
  const attemptsLeft = Math.max(0, MAX_ATTEMPTS - failedAttempts);

  return (
    <div className="min-h-screen max-w-md mx-auto bg-background flex flex-col">
      <header className="px-5 pt-5 pb-3">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground active:scale-95">
          <ArrowLeft className="w-4 h-4" /> {t("admin.back")}
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-5">
        <div className="w-full bg-card rounded-3xl p-6 shadow-card space-y-4">
          <div className="flex flex-col items-center text-center gap-2">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isLocked ? "bg-destructive/10" : "gradient-primary"}`}>
              {isLocked ? (
                <ShieldAlert className="w-6 h-6 text-destructive" />
              ) : (
                <Lock className="w-6 h-6 text-white" />
              )}
            </div>
            <h1 className="font-display font-bold text-xl">
              {isLocked ? t("admin.lockedTitle") : t("admin.authTitle")}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isLocked ? t("admin.lockedSub") : t("admin.authSubtitle")}
            </p>
            {isLocked && (
              <div className="mt-2 px-4 py-2 rounded-2xl bg-destructive/10 text-destructive font-mono font-bold text-2xl tabular-nums">
                {formatMs(remaining)}
              </div>
            )}
          </div>

          {!isLocked && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const res = loginWithPassword(pwd);
                if (!res.ok) {
                  setError(true);
                  setPwd("");
                }
              }}
              className="space-y-3"
            >
              <div>
                <Label>{t("admin.password")}</Label>
                <Input
                  type="password"
                  value={pwd}
                  onChange={(e) => {
                    setPwd(e.target.value);
                    setError(false);
                  }}
                  autoFocus
                  className={error ? "border-destructive" : ""}
                />
                {error && (
                  <p className="text-[11px] text-destructive mt-1">
                    {t("admin.wrongPassword")} • {t("admin.attemptsLeft")}: {attemptsLeft}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full gradient-primary">
                {t("admin.login")}
              </Button>
            </form>
          )}

          {user?.id && (
            <p className="text-[11px] text-center text-muted-foreground">
              Telegram ID: {user.id}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminGate;
