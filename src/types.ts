export type Detection = {
  class_id: number;
  class_name: string;
  confidence: number;
  box: [number, number, number, number];
};

export type AlertMsg = {
  type: "ALERTA";
  weapon_type: string;
  confidence: number;
  evidence_url: string;
  timestamp: string;
};

export type Incident = {
  _id: string;
  weapon_type: string;
  confidence: number;
  evidence_url: string;
  timestamp: string;
  camera_id?: string;
};

export type Camera = {
  _id: string;
  name: string;
  rtsp_url: string;
  enabled: boolean;
  fps_target: number;
  infer_every_n_frames: number;
};
