import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../shared/ui/card";
import { Label } from "../../../shared/ui/label";
import { Slider } from "../../../shared/ui/slider";
import { Switch } from "../../../shared/ui/switch";
import { Button } from "../../../shared/ui/button";
import { Badge } from "../../../shared/ui/badge";
import {
  CheckCircle,
  Save,
  RefreshCw,
  Cpu,
  Settings2,
  Bell,
  AlertTriangle,
  Activity,
  Zap,
  Volume2,
  Database,
} from "lucide-react";
import { toast } from "sonner";

import { getSettings, updateSettings, SystemSettings } from "../api/settingsService";

// Defaults UI
const DEFAULTS: SystemSettings = {
  confidence_threshold: 0.75,
  auto_alert: true,
  email_notifications: true,
  sound_alerts: false,
  save_evidence: true,
  max_fps: 30,
  infer_every_n_frames: 5,
};

export function Settings() {
  // UI state
  const [confidenceThreshold, setConfidenceThreshold] = useState<number[]>([
    Math.round(DEFAULTS.confidence_threshold * 100),
  ]);
  const [autoAlert, setAutoAlert] = useState(DEFAULTS.auto_alert);
  const [emailNotifications, setEmailNotifications] = useState(DEFAULTS.email_notifications);
  const [soundAlerts, setSoundAlerts] = useState(DEFAULTS.sound_alerts);
  const [saveEvidence, setSaveEvidence] = useState(DEFAULTS.save_evidence);
  const [maxFPS, setMaxFPS] = useState<number[]>([DEFAULTS.max_fps]);
  const [inferenceInterval, setInferenceInterval] = useState<number[]>([
    DEFAULTS.infer_every_n_frames,
  ]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const modelStatus = useMemo(() => {
    return {
      name: "YOLOv8-Weapons",
      version: "2.1.0",
      accuracy: 94.2,
      status: "loaded" as "loaded" | "offline",
      lastUpdate: updatedAt ? updatedAt.slice(0, 10) : "—",
    };
  }, [updatedAt]);

  const applyFromBackend = (data: SystemSettings) => {
    setConfidenceThreshold([Math.round((data.confidence_threshold ?? DEFAULTS.confidence_threshold) * 100)]);
    setAutoAlert(Boolean(data.auto_alert));
    setEmailNotifications(Boolean(data.email_notifications));
    setSoundAlerts(Boolean(data.sound_alerts));
    setSaveEvidence(Boolean(data.save_evidence));
    setMaxFPS([Number(data.max_fps ?? DEFAULTS.max_fps)]);
    setInferenceInterval([Number(data.infer_every_n_frames ?? DEFAULTS.infer_every_n_frames)]);
    setUpdatedAt(data.updated_at ?? null);
  };

  const loadSettings = async (silent = false) => {
    setLoading(true);
    try {
      const data = await getSettings();
      applyFromBackend(data);
      if (!silent) toast.success("Configuración cargada");
    } catch (e: any) {
      if (!silent) {
        toast.error("No se pudo cargar la configuración", {
          description: String(e?.message ?? e),
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Partial<SystemSettings> = {
        confidence_threshold: (confidenceThreshold[0] ?? 75) / 100,
        auto_alert: autoAlert,
        email_notifications: emailNotifications,
        sound_alerts: soundAlerts,
        save_evidence: saveEvidence,
        max_fps: maxFPS[0] ?? 30,
        infer_every_n_frames: inferenceInterval[0] ?? 5,
      };

      // ✅ Esto ahora hace PATCH /settings
      const updated = await updateSettings(payload);
      applyFromBackend(updated);

      toast.success("Configuración guardada exitosamente", {
        description: "Los cambios se han aplicado al sistema",
      });
    } catch (e: any) {
      toast.error("No se pudo guardar la configuración", {
        description: String(e?.message ?? e),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfidenceThreshold([Math.round(DEFAULTS.confidence_threshold * 100)]);
    setAutoAlert(DEFAULTS.auto_alert);
    setEmailNotifications(DEFAULTS.email_notifications);
    setSoundAlerts(DEFAULTS.sound_alerts);
    setSaveEvidence(DEFAULTS.save_evidence);
    setMaxFPS([DEFAULTS.max_fps]);
    setInferenceInterval([DEFAULTS.infer_every_n_frames]);

    toast.info("Configuración restablecida", {
      description: "Se restauraron los valores predeterminados (solo UI).",
    });
  };

  const MiniStat = ({
    icon,
    label,
    value,
    sub,
    accentBg,
  }: {
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
    sub?: React.ReactNode;
    accentBg: string;
  }) => (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="flex items-center gap-2">
        <div className={`p-2 rounded-lg ${accentBg}`}>{icon}</div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{label}</p>
      </div>
      <div className="mt-2">
        <div className="text-base font-bold text-slate-900">{value}</div>
        {sub && <div className="text-xs text-slate-600 mt-1">{sub}</div>}
      </div>
    </div>
  );

  const SliderBlock = ({
    id,
    icon,
    title,
    desc,
    valueLabel,
    value,
    onChange,
    min,
    max,
    step,
    leftHint,
    rightHint,
  }: {
    id: string;
    icon: React.ReactNode;
    title: string;
    desc: string;
    valueLabel: string;
    value: number[];
    onChange: (v: number[]) => void;
    min: number;
    max: number;
    step: number;
    leftHint: string;
    rightHint: string;
  }) => (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="bg-slate-100 p-2 rounded-lg">{icon}</div>
            <Label htmlFor={id} className="text-sm font-bold text-slate-900">
              {title}
            </Label>
          </div>
          <p className="text-xs text-slate-600 mt-1 ml-10">{desc}</p>
        </div>
        <Badge className="bg-slate-900 text-white font-mono text-sm px-3 py-1">{valueLabel}</Badge>
      </div>

      <div className="mt-3 ml-10 pr-2">
        <Slider id={id} min={min} max={max} step={step} value={value} onValueChange={onChange} className="w-full" />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-slate-500 font-mono">{leftHint}</span>
          <span className="text-[10px] text-slate-500 font-mono">{rightHint}</span>
        </div>
      </div>
    </div>
  );

  const ToggleItem = ({
    id,
    icon,
    title,
    desc,
    checked,
    onChange,
  }: {
    id: string;
    icon: React.ReactNode;
    title: string;
    desc: string;
    checked: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <div className="bg-slate-100 p-2 rounded-lg shrink-0">{icon}</div>
        <div className="min-w-0">
          <Label htmlFor={id} className="text-sm font-bold text-slate-900 cursor-pointer">
            {title}
          </Label>
          <p className="text-xs text-slate-600 mt-1">{desc}</p>
        </div>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Configuración</h1>
          <p className="text-slate-600 text-sm mt-1">Ajusta parámetros del modelo, detección y notificaciones</p>
        </div>

        <Button
          onClick={() => loadSettings(false)}
          variant="outline"
          size="sm"
          className="h-10 hover:bg-slate-50"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Cargando..." : "Recargar"}
        </Button>
      </div>

      {/* Estado del modelo */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader className="border-b bg-gradient-to-r from-blue-600 to-blue-700 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-xl">
              <Cpu className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base text-white">Estado del Modelo de IA</CardTitle>
              <CardDescription className="text-blue-100 text-xs">Información del modelo YOLO activo</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <MiniStat
              accentBg="bg-blue-100"
              icon={<Activity className="h-4 w-4 text-blue-600" />}
              label="Modelo"
              value={modelStatus.name}
            />
            <MiniStat
              accentBg="bg-purple-100"
              icon={<Zap className="h-4 w-4 text-purple-600" />}
              label="Versión"
              value={<span className="font-mono">{modelStatus.version}</span>}
            />
            <MiniStat
              accentBg="bg-emerald-100"
              icon={<CheckCircle className="h-4 w-4 text-emerald-600" />}
              label="Precisión"
              value={`${modelStatus.accuracy}%`}
            />

            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-4">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${modelStatus.status === "loaded" ? "bg-emerald-100" : "bg-rose-100"}`}>
                  {modelStatus.status === "loaded" ? (
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                  )}
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Estado</p>
              </div>

              <div className="mt-2">
                {modelStatus.status === "loaded" ? (
                  <Badge className="bg-emerald-600 text-white shadow-sm text-xs px-3 py-1 inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                    Cargado
                  </Badge>
                ) : (
                  <Badge className="bg-rose-600 text-white shadow-sm text-xs px-3 py-1 inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-white" />
                    Offline
                  </Badge>
                )}
              </div>

              <p className="text-[11px] text-slate-600 mt-2">
                Última actualización: <span className="font-mono">{modelStatus.lastUpdate}</span>
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-700">Acciones del modelo</p>
              <p className="text-[11px] text-slate-600">Recarga el modelo si hiciste cambios o actualizaciones.</p>
            </div>
            <Button variant="outline" size="sm" className="h-9 hover:bg-slate-50" disabled>
              <RefreshCw className="h-4 w-4 mr-2" />
              Recargar modelo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Parámetros de detección */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-slate-100 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2.5 rounded-xl">
              <Settings2 className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-base">Parámetros de Detección</CardTitle>
              <CardDescription className="text-xs">Umbral, FPS y frecuencia de inferencia</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-5 space-y-3">
          <SliderBlock
            id="confidence"
            icon={<Activity className="h-4 w-4 text-blue-600" />}
            title="Umbral de Confianza"
            desc="Solo se registran detecciones por encima de este valor."
            valueLabel={`${confidenceThreshold[0]}%`}
            value={confidenceThreshold}
            onChange={setConfidenceThreshold}
            min={50}
            max={100}
            step={1}
            leftHint="50%"
            rightHint="100%"
          />

          <SliderBlock
            id="fps"
            icon={<Zap className="h-4 w-4 text-emerald-600" />}
            title="FPS Máximo por Cámara"
            desc="Límite de cuadros por segundo procesados por cámara."
            valueLabel={`${maxFPS[0]} FPS`}
            value={maxFPS}
            onChange={setMaxFPS}
            min={10}
            max={60}
            step={5}
            leftHint="10 FPS"
            rightHint="60 FPS"
          />

          <SliderBlock
            id="inference"
            icon={<Activity className="h-4 w-4 text-amber-600" />}
            title="Inferencia cada N frames"
            desc="Mayor N reduce carga, pero puede perder eventos rápidos."
            valueLabel={`1/${inferenceInterval[0]}`}
            value={inferenceInterval}
            onChange={setInferenceInterval}
            min={1}
            max={30}
            step={1}
            leftHint="Cada frame"
            rightHint="Cada 30"
          />
        </CardContent>
      </Card>

      {/* Notificaciones y evidencias */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-slate-100 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-rose-100 p-2.5 rounded-xl">
              <Bell className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <CardTitle className="text-base">Notificaciones y Evidencias</CardTitle>
              <CardDescription className="text-xs">
                Controla alertas, email, sonido y guardado automático
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ToggleItem
              id="autoAlert"
              icon={<Bell className="h-4 w-4 text-blue-600" />}
              title="Alertas automáticas"
              desc="Genera alertas al detectar armas."
              checked={autoAlert}
              onChange={setAutoAlert}
            />

            <ToggleItem
              id="emailNotifications"
              icon={<AlertTriangle className="h-4 w-4 text-purple-600" />}
              title="Notificaciones por email"
              desc="Envía email en incidentes críticos."
              checked={emailNotifications}
              onChange={setEmailNotifications}
            />

            <ToggleItem
              id="soundAlerts"
              icon={<Volume2 className="h-4 w-4 text-amber-600" />}
              title="Alertas sonoras"
              desc="Reproduce sonido en el navegador."
              checked={soundAlerts}
              onChange={setSoundAlerts}
            />

            <ToggleItem
              id="saveEvidence"
              icon={<Database className="h-4 w-4 text-emerald-600" />}
              title="Guardar evidencia"
              desc="Guarda capturas automáticamente."
              checked={saveEvidence}
              onChange={setSaveEvidence}
            />
          </div>
        </CardContent>
      </Card>

      {/* Acciones */}
      <div className="flex flex-col sm:flex-row gap-2 pt-1 pb-4">
        <Button
          onClick={handleSave}
          size="sm"
          className="h-10 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md"
          disabled={saving}
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Guardando..." : "Guardar"}
        </Button>

        <Button onClick={handleReset} variant="outline" size="sm" className="h-10 hover:bg-slate-100">
          <RefreshCw className="h-4 w-4 mr-2" />
          Restablecer
        </Button>
      </div>
    </div>
  );
}