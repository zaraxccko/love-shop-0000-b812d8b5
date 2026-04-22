// ============================================================
// 💱 Курсы крипты (CoinGecko, публичный API, без ключа)
// ============================================================
// Кэшируем результат на 60 секунд в памяти + sessionStorage.
// CoinGecko ограничивает ~30 req/min на IP — этого хватает с запасом.
// USDT всегда = $1 (стейбл), не дёргаем сеть для него.
// ============================================================
import { useEffect, useState } from "react";
import type { CryptoCode } from "@/store/account";

type Rates = Partial<Record<CryptoCode, number>>; // USD per 1 unit

const COINGECKO_IDS: Record<CryptoCode, string> = {
  USDT: "tether",
  TRX: "tron",
  BTC: "bitcoin",
  SOL: "solana",
  TON: "the-open-network",
};

const TTL_MS = 60_000;
const CACHE_KEY = "loveshop-crypto-rates";

let memCache: { ts: number; rates: Rates } | null = null;
let inflight: Promise<Rates> | null = null;

function readSession(): { ts: number; rates: Rates } | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.ts === "number" && parsed?.rates) return parsed;
  } catch {}
  return null;
}

function writeSession(data: { ts: number; rates: Rates }) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {}
}

async function fetchRates(): Promise<Rates> {
  const ids = Object.values(COINGECKO_IDS).join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`coingecko ${res.status}`);
  const data = (await res.json()) as Record<string, { usd: number }>;
  const rates: Rates = { USDT: 1 };
  (Object.keys(COINGECKO_IDS) as CryptoCode[]).forEach((code) => {
    const id = COINGECKO_IDS[code];
    const usd = data[id]?.usd;
    if (typeof usd === "number" && usd > 0) rates[code] = usd;
  });
  return rates;
}

export async function getRates(force = false): Promise<Rates> {
  const now = Date.now();
  if (!force) {
    if (memCache && now - memCache.ts < TTL_MS) return memCache.rates;
    if (!memCache) {
      const sess = readSession();
      if (sess && now - sess.ts < TTL_MS) {
        memCache = sess;
        return sess.rates;
      }
    }
  }
  if (inflight) return inflight;
  inflight = fetchRates()
    .then((rates) => {
      const merged = { ...(memCache?.rates ?? {}), ...rates };
      memCache = { ts: Date.now(), rates: merged };
      writeSession(memCache);
      return merged;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useCryptoRates() {
  const [rates, setRates] = useState<Rates>(() => memCache?.rates ?? readSession()?.rates ?? { USDT: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number>(memCache?.ts ?? 0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const r = await getRates();
        if (!alive) return;
        setRates(r);
        setUpdatedAt(Date.now());
      } catch {
        if (alive) setError(true);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    const id = window.setInterval(load, TTL_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  return { rates, loading, error, updatedAt };
}

/**
 * Сколько монет нужно отправить за `amountUSD`.
 * Возвращает число с разумным количеством знаков:
 *   - BTC: 8 знаков
 *   - SOL/TON/TRX: 4 знака
 *   - USDT: 2 знака
 */
export function convertUSDToCrypto(amountUSD: number, code: CryptoCode, rates: Rates): number | null {
  const rate = rates[code];
  if (!rate || rate <= 0) return null;
  return amountUSD / rate;
}

export function formatCryptoAmount(value: number, code: CryptoCode): string {
  const decimals = code === "BTC" ? 8 : code === "USDT" ? 2 : 4;
  // округляем ВВЕРХ до последнего знака — чтобы юзер точно не недоплатил
  const factor = Math.pow(10, decimals);
  const rounded = Math.ceil(value * factor) / factor;
  return rounded.toFixed(decimals);
}
