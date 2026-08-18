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
  deleteAlert as deleteAlertApi,
} from "../../api/alerts";

import { connectAlertWebSocket } from "../../websocket/alerts";
import { AlertaEntranteModal } from "../../components/AlertaEntranteModal";

type WsStatus = "connected" | "disconnected" | "error";

type AlertsContextValue = {
  alerts: AlertUI[];
  unreadCount: number;
  wsStatus: WsStatus;
  loading: boolean;

  /**
   * Última alerta llegada por WebSocket y todavía sin atender.
   *
   * Existe para poder interrumpir al operador: en un sistema de detección de
   * armas no basta con que el aviso aparezca en una lista que quizá no esté
   * mirando.
   */
  alertaEntrante: AlertUI | null;
  descartarEntrante: () => void;

  refresh: () => Promise<void>;
  refreshAlerts: () => Promise<void>;

  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteAlert: (id: string) => Promise<void>;
};

const AlertsContext = createContext<AlertsContextValue | null>(null);

/**
 * Aviso sonoro corto, sintetizado con la Web Audio API.
 *
 * Se genera en el navegador en vez de cargar un archivo de audio: no añade
 * peso ni una descarga que la red pueda bloquear. Si el navegador impide
 * reproducir sonido, falla en silencio y el aviso visual sigue funcionando.
 */
function sonarAviso() {
  try {
    const Ctx =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;

    const ctx = new Ctx();
    const ahora = ctx.currentTime;

    // Dos pulsos: se distingue de cualquier notificación del sistema.
    [0, 0.22].forEach((retraso) => {
      const osc = ctx.createOscillator();
      const vol = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ahora + retraso);
      vol.gain.setValueAtTime(0.0001, ahora + retraso);
      vol.gain.exponentialRampToValueAtTime(0.25, ahora + retraso + 0.02);
      vol.gain.exponentialRampToValueAtTime(0.0001, ahora + retraso + 0.16);
      osc.connect(vol).connect(ctx.destination);
      osc.start(ahora + retraso);
      osc.stop(ahora + retraso + 0.18);
    });

    window.setTimeout(() => ctx.close().catch(() => {}), 900);
  } catch {
    // El navegador puede bloquear el audio sin interacción previa del usuario.
  }
}

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
  const [alertaEntrante, setAlertaEntrante] = useState<AlertUI | null>(null);

  const descartarEntrante = useCallback(() => setAlertaEntrante(null), []);

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

  const deleteAlert = useCallback(
    async (id: string) => {
      const previousAlerts = alerts;

      setAlerts((prev) => prev.filter((a) => a._id !== id));

      try {
        await deleteAlertApi(id);
      } catch (error) {
        setAlerts(previousAlerts);
        throw error;
      }
    },
    [alerts]
  );

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

        // Solo interrumpe con alertas llegadas en vivo, no con las que ya
        // estaban en la base al abrir el panel.
        setAlertaEntrante(newAlert);
        sonarAviso();
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
        alertaEntrante,
        descartarEntrante,
        refresh,
        refreshAlerts: refresh,
        markAsRead,
        markAllAsRead,
        deleteAlert,
      }}
    >
      {children}

      {/* Se monta aquí, junto al WebSocket, para que el aviso interrumpa
          desde cualquier módulo y no solo estando en el centro de alertas. */}
      <AlertaEntranteModal
        alerta={alertaEntrante}
        onCerrar={descartarEntrante}
        onMarcarLeida={(id) => {
          markAsRead(id).catch(() => {});
        }}
      />
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
