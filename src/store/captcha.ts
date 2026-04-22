import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Капча на входе в мини-апп.
 * Юзер должен найти 🥥 среди 🍓.
 *
 * Хранится в localStorage, чтобы не показывать каждый раз —
 * сбрасывается через `reset()` (DEV-кнопка в шапке).
 */
interface CaptchaState {
  passed: boolean;
  pass: () => void;
  reset: () => void;
}

export const useCaptcha = create<CaptchaState>()(
  persist(
    (set) => ({
      passed: false,
      pass: () => set({ passed: true }),
      reset: () => set({ passed: false }),
    }),
    { name: "loveshop-captcha" }
  )
);
