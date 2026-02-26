import { http } from "./http";

export type CameraIn = {
  name: string;
  rtsp_url: string;
  enabled: boolean;
  fps_target: number;
  infer_every_n_frames: number;
};

export type CameraOut = {
  id: string | number;
  name?: string;
  rtsp_url?: string;
  enabled?: boolean;
  fps_target?: number;
  infer_every_n_frames?: number;
  status?: string; // RUNNING/STOPPED o active/inactive
};

export async function listCameras() {
  const { data } = await http.get<CameraOut[]>("/cameras");
  return data;
}

export async function createCamera(payload: CameraIn) {
  const { data } = await http.post<CameraOut>("/cameras", payload);
  return data;
}

export async function updateCamera(cameraId: string | number, payload: Partial<CameraIn>) {
  const { data } = await http.patch<CameraOut>(`/cameras/${cameraId}`, payload);
  return data;
}

export async function deleteCamera(cameraId: string | number) {
  const { data } = await http.delete(`/cameras/${cameraId}`);
  return data;
}

export async function startCamera(cameraId: string | number) {
  const { data } = await http.post(`/cameras/${cameraId}/start`);
  return data;
}

export async function stopCamera(cameraId: string | number) {
  const { data } = await http.post(`/cameras/${cameraId}/stop`);
  return data;
}