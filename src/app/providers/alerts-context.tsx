import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AlertUI,
  listAlerts,
  markAlertRead,
  normalizeAlert,
} from "../../api/alerts";

import { connectAlertWebSocket } from "../../websocket/alerts";

type WsStatus = "connected" | "disconnected" | "error";

type AlertsContextValue = {
  alerts: AlertUI[];
  unreadCount: number;
  wsStatus: WsStatus;
  loading: boolean;

  // Compatibilidad con componentes existentes
  refresh: () => Promise<void>;
  refreshAlerts: () => Promise<void>;

  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
};

const AlertsContext = createContext<AlertsContextValue | null>(null);

function hasToken() {
  return Boolean(
    localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      sessionStorage.getItem("access_token") ||
      sessionStorage.getItem("token")
  );
}

export function AlertsProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<AlertUI[]>([]);
  const [wsStatus, setWsStatus] = useState<WsStatus>("disconnected");
  const [loading, setLoading] = useState(false);

  const pollingRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const refresh = useCallback(async () => {
    if (!hasToken()) {
      setAlerts([]);
      return;
    }

    try {
      setLoading(true);

      const data = await listAlerts(200);

      data.sort((a, b) =>
        String(b.timestamp ?? b.created_at ?? "").localeCompare(
          String(a.timestamp ?? a.created_at ?? "")
        )
      );

      setAlerts(data);
    } catch (error) {
      console.error("Error cargando alertas:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a._id === id ? { ...a, read: true } : a))
    );

    try {
      await markAlertRead(id, true);
    } catch (error) {
      setAlerts((prev) =>
        prev.map((a) => (a._id === id ? { ...a, read: false } : a))
      );
      throw error;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unread = alerts.filter((a) => !a.read);

    if (unread.length === 0) return;

    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));

    try {
      await Promise.all(unread.map((a) => markAlertRead(a._id, true)));
    } catch (error) {
      await refresh();
      throw error;
    }
  }, [alerts, refresh]);

  useEffect(() => {
    refresh().catch(console.error);

    if (wsRef.current) {
      wsRef.current.close();
    }

    wsRef.current = connectAlertWebSocket(
      (newAlertRaw) => {
        const newAlert = normalizeAlert(newAlertRaw);

        setAlerts((prev) => {
          const exists = prev.some((item) => item._id === newAlert._id);

          if (exists) return prev;

          return [newAlert, ...prev];
        });
      },
      (status) => {
        setWsStatus(status);
      }
    );

    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
    }

    pollingRef.current = window.setInterval(() => {
      refresh().catch(() => {});
    }, 60000);

    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
      }

      if (wsRef.current) {
        wsRef.current.close();
      }

      pollingRef.current = null;
      wsRef.current = null;
    };
  }, [refresh]);

  const unreadCount = useMemo(
    () => alerts.filter((a) => !a.read).length,
    [alerts]
  );

  return (
    <AlertsContext.Provider
      value={{
        alerts,
        unreadCount,
        wsStatus,
        loading,

        // Los dos nombres apuntan a la misma función
        refresh,
        refreshAlerts: refresh,

        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </AlertsContext.Provider>
  );
}

export function useAlerts() {
  const ctx = useContext(AlertsContext);

  if (!ctx) {
    throw new Error("useAlerts debe usarse dentro de AlertsProvider");
  }

  return ctx;
}
