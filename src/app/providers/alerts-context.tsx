import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
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
  refreshAlerts: () => Promise<void>;
  markAsRead: (alertId: string) => Promise<void>;
};

const AlertsContext = createContext<AlertsContextValue | undefined>(undefined);

export function AlertsProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<AlertUI[]>([]);
  const [wsStatus, setWsStatus] = useState<WsStatus>("disconnected");
  const [loading, setLoading] = useState(false);

  async function refreshAlerts() {
    try {
      setLoading(true);
      const data = await listAlerts(200);
      setAlerts(data);
    } catch (error) {
      console.error("Error cargando alertas:", error);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(alertId: string) {
    try {
      const updated = await markAlertRead(alertId, true);

      setAlerts((prev) =>
        prev.map((alert) => (alert._id === alertId ? updated : alert))
      );
    } catch (error) {
      console.error("Error marcando alerta como leída:", error);
    }
  }

  useEffect(() => {
    refreshAlerts();

    const ws = connectAlertWebSocket(
      (newAlertRaw) => {
        const newAlert = normalizeAlert(newAlertRaw);

        setAlerts((prev) => {
          const exists = prev.some((item) => item._id === newAlert._id);

          if (exists) {
            return prev;
          }

          return [newAlert, ...prev];
        });
      },
      (status) => {
        setWsStatus(status);
      }
    );

    const fallbackPolling = window.setInterval(() => {
      refreshAlerts();
    }, 60000);

    return () => {
      window.clearInterval(fallbackPolling);
      ws.close();
    };
  }, []);

  const unreadCount = useMemo(() => {
    return alerts.filter((alert) => !alert.read).length;
  }, [alerts]);

  const value: AlertsContextValue = {
    alerts,
    unreadCount,
    wsStatus,
    loading,
    refreshAlerts,
    markAsRead,
  };

  return (
    <AlertsContext.Provider value={value}>
      {children}
    </AlertsContext.Provider>
  );
}

export function useAlerts() {
  const context = useContext(AlertsContext);

  if (!context) {
    throw new Error("useAlerts debe usarse dentro de AlertsProvider");
  }

  return context;
}
