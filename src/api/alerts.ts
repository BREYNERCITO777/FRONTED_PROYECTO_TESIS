// frontend/src/api/alerts.ts
import { http } from "./http";

export type AlertOut = {
  _id?: string;
  id?: string;

  title?: string;
  message?: string;

  camera_id?: string | number;
  weapon_type?: string;

  confidence?: number; // 0..1 (tu backend lo manda float)
  severity?: string; // critical | high | medium | low
  read?: boolean;

  created_at?: string;
  timestamp?: string;
  evidence_url?: string;
};

export type AlertUI = {
  _id: string;
  title: string;
  message: string;
  camera_id?: string;
  weapon_type?: string;
  confidence?: number; // 0..1
  severity: "critical" | "high" | "medium" | "low";
  read: boolean;
  timestamp?: string;
  evidence_url?: string;
};

function normalizeSeverity(s?: string): AlertUI["severity"] {
  const v = String(s ?? "").toLowerCase();
  if (v === "critical") return "critical";
  if (v === "high") return "high";
  if (v === "medium") return "medium";
  return "low";
}

function normalizeConfidence(c?: number): number | undefined {
  if (c == null) return undefined;
  const n = Number(c);
  if (!Number.isFinite(n)) return undefined;
  // por si alguna vez viniera 0-100
  const val = n > 1 ? n / 100 : n;
  return Math.max(0, Math.min(1, val));
}

export function normalizeAlert(raw: any): AlertUI {
  const _id = String(raw._id ?? raw.id ?? "");
  return {
    _id,
    title: String(raw.title ?? "Alerta"),
    message: String(raw.message ?? ""),
    camera_id: raw.camera_id != null ? String(raw.camera_id) : undefined,
    weapon_type: raw.weapon_type != null ? String(raw.weapon_type) : undefined,
    confidence: normalizeConfidence(raw.confidence),
    severity: normalizeSeverity(raw.severity),
    read: Boolean(raw.read),
    timestamp: raw.timestamp ?? raw.created_at ?? undefined,
    evidence_url: raw.evidence_url ?? undefined,
  };
}

export async function listAlerts(limit = 50): Promise<AlertUI[]> {
  const { data } = await http.get<AlertOut[]>(`/alerts?limit=${limit}`);
  const arr = Array.isArray(data) ? data : [];
  return arr.map(normalizeAlert);
}

export async function markAlertRead(alertId: string, read = true): Promise<AlertUI> {
  // tu backend: PATCH /alerts/{id}/read?read=true
  const { data } = await http.patch<AlertOut>(`/alerts/${alertId}/read?read=${read}`);
  return normalizeAlert(data);
}

export async function deleteAlert(alertId: string): Promise<{ deleted: boolean; alert_id: string }> {
  const { data } = await http.delete(`/alerts/${alertId}`);
  return data;
}