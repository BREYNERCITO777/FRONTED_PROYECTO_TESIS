// frontend/src/app/providers/alerts-context.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { http } from "../../api/http";
import { useAuth } from "../../context/auth-context";

type Severity = "critical" | "high" | "medium" | "low";

export interface AlertApi {
  _id: string;
  type?: string;
  title: string;
  message: string;
  severity: Severity;
  weapon_type?: string | null;
  confidence?: number | null;
  evidence_url?: string | null;
  camera_id?: string | null;
  timestamp?: string | null;
  read?: boolean;
}

type AlertsContextValue = {
  alerts: AlertApi[];
  unreadCount: number;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteAlert: (id: string) => Promise<void>; // solo admin (backend valida)
};

const AlertsContext = createContext<AlertsContextValue | null>(null);

function normalizeSeverity(s: any): Severity {
  const v = String(s ?? "medium").toLowerCase();
  if (v === "critical") return "critical";
  if (v === "high") return "high";
  if (v === "medium") return "medium";
  return "low";
}

function normalizeConfidence(c: any): number | null {
  if (c == null) return null;
  const n = Number(c);
  if (!Number.isFinite(n)) return null;
  const v = n > 1 ? n / 100 : n; // por si viniera 0-100
  return Math.max(0, Math.min(1, v));
}

function normalizeAlert(a: any): AlertApi {
  return {
    _id: String(a._id ?? a.id ?? ""),
    type: a.type ?? "ALERTA",
    title: a.title ?? "Detección",
    message: a.message ?? "",
    severity: normalizeSeverity(a.severity),
    weapon_type: a.weapon_type ?? null,
    confidence: normalizeConfidence(a.confidence),
    evidence_url: a.evidence_url ?? null,
    camera_id: a.camera_id ?? null,
    timestamp: a.timestamp ?? a.created_at ?? null,
    read: !!a.read,
  };
}

export function AlertsProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const [alerts, setAlerts] = useState<AlertApi[]>([]);
  const pollingRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    const { data } = await http.get(`/alerts?limit=200`);
    const arr = (Array.isArray(data) ? data : []).map(normalizeAlert);

    // orden desc por timestamp ISO
    arr.sort((a: AlertApi, b: AlertApi) =>
      String(b.timestamp ?? "").localeCompare(String(a.timestamp ?? ""))
    );

    setAlerts(arr);
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    // optimistic
    setAlerts((prev) => prev.map((a) => (a._id === id ? { ...a, read: true } : a)));
    try {
      await http.patch(`/alerts/${id}/read?read=true`);
    } catch (e) {
      setAlerts((prev) => prev.map((a) => (a._id === id ? { ...a, read: false } : a)));
      throw e;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unread = alerts.filter((a) => !a.read);
    if (unread.length === 0) return;

    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    try {
      await Promise.all(unread.map((a) => http.patch(`/alerts/${a._id}/read?read=true`)));
    } catch (e) {
      await refresh();
      throw e;
    }
  }, [alerts, refresh]);

  const deleteAlert = useCallback(async (id: string) => {
    // backend valida rol admin, pero aquí no dependemos de user.role para no romper
    const prev = alerts;
    setAlerts((p) => p.filter((a) => a._id !== id));
    try {
      await http.delete(`/alerts/${id}`);
    } catch (e) {
      setAlerts(prev);
      throw e;
    }
  }, [alerts]);

  const unreadCount = useMemo(() => alerts.filter((a) => !a.read).length, [alerts]);

  // ✅ POLLING: cada 4s (ajusta a 5–8s si quieres menos carga)
  useEffect(() => {
    // si no hay sesión -> parar polling y limpiar
    if (!user || !token) {
      if (pollingRef.current) window.clearInterval(pollingRef.current);
      pollingRef.current = null;
      setAlerts([]);
      return;
    }

    // carga inmediata
    refresh().catch(console.error);

    if (pollingRef.current) window.clearInterval(pollingRef.current);
    pollingRef.current = window.setInterval(() => {
      refresh().catch(() => {});
    }, 4000);

    return () => {
      if (pollingRef.current) window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    };
  }, [user?._id, token, refresh]);

  return (
    <AlertsContext.Provider
      value={{ alerts, unreadCount, refresh, markAsRead, markAllAsRead, deleteAlert }}
    >
      {children}
    </AlertsContext.Provider>
  );
}

export function useAlerts() {
  const ctx = useContext(AlertsContext);
  if (!ctx) throw new Error("useAlerts debe usarse dentro de <AlertsProvider/>");
  return ctx;
}