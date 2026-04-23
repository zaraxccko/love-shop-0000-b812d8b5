import { create } from "zustand";
import { toast } from "sonner";
import { Admin } from "@/lib/api";
import { MOCK_ANALYTICS, type AnalyticsSnapshot } from "@/lib/analyticsMock";
import type { Deposit, OrderRecord } from "@/store/account";

type AdminOrderRecord = OrderRecord & { customerUsername?: string };
type AdminDepositRecord = Deposit & { customerUsername?: string };

interface AdminPanelState {
  awaitingOrders: AdminOrderRecord[];
  awaitingDeposits: AdminDepositRecord[];
  historyOrders: AdminOrderRecord[];
  historyDeposits: AdminDepositRecord[];
  analytics: AnalyticsSnapshot;
  loadingQueue: boolean;
  loadingAnalytics: boolean;
  refreshQueue: () => Promise<void>;
  refreshAnalytics: () => Promise<void>;
  refreshAll: () => Promise<void>;
  confirmOrder: (id: string, payload: { photo?: string; text?: string }) => Promise<void>;
  cancelOrder: (id: string) => Promise<void>;
  confirmDeposit: (id: string) => Promise<void>;
  cancelDeposit: (id: string) => Promise<void>;
}

export const useAdminPanel = create<AdminPanelState>((set, get) => ({
  awaitingOrders: [],
  awaitingDeposits: [],
  historyOrders: [],
  historyDeposits: [],
  analytics: MOCK_ANALYTICS,
  loadingQueue: false,
  loadingAnalytics: false,

  refreshQueue: async () => {
    set({ loadingQueue: true });
    try {
      const [{ orders: awaitingOrders, deposits: awaitingDeposits }, { orders: historyOrders, deposits: historyDeposits }] = await Promise.all([
        Admin.awaiting(),
        Admin.history(),
      ]);
      set({
        awaitingOrders: normalizeOrders(awaitingOrders),
        awaitingDeposits: normalizeDeposits(awaitingDeposits),
        historyOrders: normalizeOrders(historyOrders),
        historyDeposits: normalizeDeposits(historyDeposits),
        loadingQueue: false,
      });
    } catch (error) {
      console.error("[adminPanel] failed to load queue", error);
      toast.error("Не удалось загрузить заявки админки");
      set({ loadingQueue: false });
    }
  },

  refreshAnalytics: async () => {
    set({ loadingAnalytics: true });
    try {
      const analytics = (await Admin.analytics()) as AnalyticsSnapshot;
      set({ analytics, loadingAnalytics: false });
    } catch (error) {
      console.error("[adminPanel] failed to load analytics", error);
      toast.error("Не удалось загрузить аналитику");
      set({ loadingAnalytics: false });
    }
  },

  refreshAll: async () => {
    await Promise.all([get().refreshQueue(), get().refreshAnalytics()]);
  },

  confirmOrder: async (id, payload) => {
    try {
      await Admin.confirmOrder(id, {
        photo: payload.photo?.startsWith("data:") ? await dataUrlToFile(payload.photo, "confirm.jpg") : undefined,
        text: payload.text,
      });
      await get().refreshAll();
    } catch (error) {
      toast.error("Не удалось подтвердить заказ");
      throw error;
    }
  },

  cancelOrder: async (id) => {
    try {
      await Admin.cancelOrder(id);
      await get().refreshAll();
    } catch (error) {
      toast.error("Не удалось отменить заказ");
      throw error;
    }
  },

  confirmDeposit: async (id) => {
    try {
      await Admin.confirmDeposit(id);
      await get().refreshAll();
    } catch (error) {
      toast.error("Не удалось подтвердить пополнение");
      throw error;
    }
  },

  cancelDeposit: async (id) => {
    try {
      await Admin.cancelDeposit(id);
      await get().refreshAll();
    } catch (error) {
      toast.error("Не удалось отменить пополнение");
      throw error;
    }
  },
}));

function normalizeOrders(input: any[]): AdminOrderRecord[] {
  return Array.isArray(input) ? input.map((item) => normalizeOrder(item)) : [];
}

function normalizeDeposits(input: any[]): AdminDepositRecord[] {
  return Array.isArray(input) ? input.map((item) => normalizeDeposit(item)) : [];
}

function normalizeOrder(item: any): AdminOrderRecord {
  const customer = item?.customer;
  return {
    ...item,
    items: Array.isArray(item?.items) ? item.items : [],
    customerName: customer?.name ?? item?.customerName,
    customerTgId: customer?.tgId ? Number(customer.tgId) : item?.customerTgId,
    customerUsername: customer?.username ?? item?.customerUsername,
  } as AdminOrderRecord;
}

function normalizeDeposit(item: any): AdminDepositRecord {
  const customer = item?.customer;
  return {
    ...item,
    customerName: customer?.name ?? item?.customerName,
    customerTgId: customer?.tgId ? Number(customer.tgId) : item?.customerTgId,
    customerUsername: customer?.username ?? item?.customerUsername,
  } as AdminDepositRecord;
}

async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "image/jpeg" });
}