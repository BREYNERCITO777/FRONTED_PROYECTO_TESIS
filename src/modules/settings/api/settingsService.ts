// frontend/src/modules/settings/api/settingsService.ts

const API_BASE =
  process.env.REACT_APP_API_BASE || "http://localhost:8000/api/v1";

export type SystemSettings = {
  confidence_threshold: number;
  auto_alert: boolean;
  email_notifications: boolean;
  sound_alerts: boolean;
  save_evidence: boolean;
  max_fps: number;
  infer_every_n_frames: number;
  updated_at?: string;
};

type ApiErrorShape = { detail?: string; message?: string } | string | null;

function getToken() {
  return localStorage.getItem("token");
}

async function http<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(url, { ...options, headers });

  const text = await res.text();
  let data: ApiErrorShape = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  if (!res.ok) {
    const msg =
      (typeof data === "object" && data && "detail" in data && (data as any).detail) ||
      (typeof data === "object" && data && "message" in data && (data as any).message) ||
      `HTTP ${res.status} ${res.statusText}`;
    throw new Error(msg);
  }

  return (data as T) ?? ({} as T);
}

export async function getSettings(): Promise<SystemSettings> {
  return http<SystemSettings>(`${API_BASE}/settings`, { method: "GET" });
}

export async function updateSettings(
  payload: Partial<SystemSettings>
): Promise<SystemSettings> {
  return http<SystemSettings>(`${API_BASE}/settings`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}