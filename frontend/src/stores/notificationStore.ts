import { create } from "zustand";
import type { NotificationResponse } from "@/lib/api/endpoints";
import { notificationsApi } from "@/lib/api/endpoints";

type NotificationState = {
  notifications: NotificationResponse[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  reset: () => void;
};

function countUnread(notifs: NotificationResponse[]): number {
  return notifs.filter((n) => n.unread).length;
}

/**
 * Notification Zustand store with optimistic mark-as-read.
 *
 * `markAsRead` / `markAllAsRead` flip the local state FIRST, then
 * fire the backend call. On API failure the optimistic state stays
 * — no flicker for the user, and the next `fetchNotifications`
 * reconciles the truth if needed. Acceptable tradeoff: the worst
 * case is a "read" notification that resurfaces as unread later.
 *
 * Not persisted — fresh load on every session start (`useAuth.login`
 * calls `fetchNotifications`).
 */
export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const res = await notificationsApi.list();
      const items = res.items ?? [];
      set({
        notifications: items,
        unreadCount: countUnread(items),
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  markAsRead: async (id: string) => {
    const prev = get().notifications;
    const updated = prev.map((n) =>
      n.id === id ? { ...n, unread: false } : n,
    );
    set({ notifications: updated, unreadCount: countUnread(updated) });
    try {
      await notificationsApi.markRead([id]);
    } catch {
      // Keep optimistic state to avoid flicker; user can retry via refresh.
    }
  },

  markAllAsRead: async () => {
    const prev = get().notifications;
    const unreadIds = prev.filter((n) => n.unread).map((n) => n.id);
    if (unreadIds.length === 0) return;
    const updated = prev.map((n) => ({ ...n, unread: false }));
    set({ notifications: updated, unreadCount: 0 });
    try {
      await notificationsApi.markRead(unreadIds);
    } catch {
      // Keep optimistic state to avoid flicker.
    }
  },

  reset: () => set({ notifications: [], unreadCount: 0, isLoading: false }),
}));
