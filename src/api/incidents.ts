// frontend/src/api/incidents.ts
import { http } from "./http";

export type IncidentOut = {
  _id?: string;
  id?: string;

  weapon_type?: string;
  type?: string;

  confidence?: number;

  camera_id?: string;
  camera_name?: string;

  image_url?: string;
  evidence_url?: string;
  snapshot_url?: string;

  created_at?: string;
  timestamp?: string;

  severity?: "critical" | "high" | "medium" | "low";
};

// LISTAR (con limit opcional)
export async function listIncidents(limit = 50) {
  const { data } = await http.get<IncidentOut[]>(`/incidents?limit=${limit}`);
  return data;
}

// BORRAR SOLO POR ID (admin)
export async function deleteIncident(incidentId: string) {
  const { data } = await http.delete(`/incidents/${incidentId}`);
  return data;
}

