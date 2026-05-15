const API_BASE =
  process.env.REACT_APP_API_BASE ||
  "https://backend-proyecto-tesis-1nv4.onrender.com/api/v1";

function getToken(): string | null {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("access_token") ||
    sessionStorage.getItem("token") ||
    null
  );
}

export type AlertOut = {
  _id: string;
  type?: string | null;
  title?: string | null;
  message?: string | null;
  severity?: string | null;
  weapon_type?: string | null;
  confidence?: number | null;
  evidence_url?: string | null;
  image_base64?: string | null;
  evidence_type?: string | null;
  camera_id?: string | null;
  camera_name?: string | null;
  incident_id?: string | null;
  source?: string | null;
  timestamp?: string | null;
  created_at?: string | null;
  read?: boolean;
};

export type AlertUI = AlertOut & {
  id: string;
  label: string;
  cameraLabel: string;
  evidenceImage?: string | null;
};

export function getEvidenceImage(
  alert?: AlertOut | null
): string | null {
  if (!alert) return null;

  // Imagen enviada desde MongoDB en base64
  if (alert.image_base64) {
    return `data:image/jpeg;base64,${alert.image_base64}`;
  }

  // Imagen servida desde backend
  if (alert.evidence_url) {
    const apiOrigin = API_BASE.replace(/\/api\/v1\/?$/, "");

    const path = alert.evidence_url.startsWith("/")
      ? alert.evidence_url
      : `/${alert.evidence_url}`;

    return `${apiOrigin}${path}`;
  }

  return null;
}

export function normalizeAlert(alert: AlertOut): AlertUI {
  return {
    ...alert,
    id: alert._id,
    label: alert.weapon_type || alert.type || "ALERTA",
    cameraLabel:
      alert.camera_name ||
      alert.camera_id ||
      "Cámara no especificada",
    evidenceImage: getEvidenceImage(alert),
  };
}

export async function listAlerts(
  limit = 200
): Promise<AlertUI[]> {
  const token = getToken();

  const response = await fetch(
    `${API_BASE}/alerts?limit=${limit}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token
          ? { Authorization: `Bearer ${token}` }
          : {}),
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Error listando alertas: ${response.status}`
    );
  }

  const data: AlertOut[] = await response.json();

  return data.map(normalizeAlert);
}

export async function getAlert(
  alertId: string
): Promise<AlertUI> {
  const token = getToken();

  const response = await fetch(
    `${API_BASE}/alerts/${alertId}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token
          ? { Authorization: `Bearer ${token}` }
          : {}),
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Error obteniendo alerta: ${response.status}`
    );
  }

  const data: AlertOut = await response.json();

  return normalizeAlert(data);
}

export async function markAlertRead(
  alertId: string,
  read = true
): Promise<AlertUI> {
  const token = getToken();

  const response = await fetch(
    `${API_BASE}/alerts/${alertId}/read?read=${read}`,
    {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        ...(token
          ? { Authorization: `Bearer ${token}` }
          : {}),
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Error marcando alerta: ${response.status}`
    );
  }

  const data: AlertOut = await response.json();

  return normalizeAlert(data);
}

export async function deleteAlert(
  alertId: string
): Promise<{
  deleted: boolean;
  alert_id: string;
}> {
  const token = getToken();

  const response = await fetch(
    `${API_BASE}/alerts/${alertId}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        ...(token
          ? { Authorization: `Bearer ${token}` }
          : {}),
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Error eliminando alerta: ${response.status}`
    );
  }

  return response.json();
}
