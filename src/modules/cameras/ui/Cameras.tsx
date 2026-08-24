import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../shared/ui/card";
import { Button } from "../../../shared/ui/button";
import { Badge } from "../../../shared/ui/badge";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { Switch } from "../../../shared/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../shared/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../shared/ui/table";
import {
  Play,
  Square,
  Pencil,
  Trash2,
  Plus,
  Video,
  Activity,
  Server,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  Maximize2,
  Minimize2,
  X,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import { API_BASE } from "../../../api/base";
import {
  listCameras,
  createCamera,
  updateCamera,
  deleteCamera,
  startCamera,
  stopCamera,
} from "../../../api/cameras";

import { useAuth } from "../../../context/auth-context";

interface Camera {
  id: string;
  name: string;
  rtsp_url: string;
  enabled: boolean;
  fps_target: number;
  infer_every_n_frames: number;
  status: "RUNNING" | "STOPPED";
}

function normalizeCamera(raw: any): Camera {
  const id = String(raw._id ?? raw.id ?? "");
  const name = String(raw.name ?? "Cámara");
  const rtsp_url = String(raw.rtsp_url ?? "0");
  const enabled = raw.enabled === undefined ? true : Boolean(raw.enabled);
  const fps_target = Number(raw.fps_target ?? 30) || 30;
  const infer_every_n_frames = Number(raw.infer_every_n_frames ?? 5) || 5;

  const rawStatus = String(raw.status ?? "").toUpperCase();
  const status: Camera["status"] =
    rawStatus === "RUNNING" || rawStatus === "STOPPED"
      ? (rawStatus as Camera["status"])
      : enabled
      ? "RUNNING"
      : "STOPPED";

  return { id, name, rtsp_url, enabled, fps_target, infer_every_n_frames, status };
}

export function Cameras() {
  const { user, token } = useAuth();
  const isAdmin = user?.role === "admin";

  const [loading, setLoading] = useState(true);
  const [cameras, setCameras] = useState<Camera[]>([]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [activeVideoCamera, setActiveVideoCamera] = useState<Camera | null>(null);

  const [editingCamera, setEditingCamera] = useState<Camera | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    rtsp_url: "",
    enabled: true,
    fps_target: 30,
    infer_every_n_frames: 5,
  });

  // ------- STREAM -------
  const [streamKey, setStreamKey] = useState<number>(Date.now());
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const getStreamUrl = useCallback(
    (cameraId: string) => {
      const base = `${API_BASE}/inference/stream/${cameraId}`;
      const qs: string[] = [];
      if (token) qs.push(`token=${encodeURIComponent(token)}`);
      qs.push(`t=${streamKey}`); // cache-bust
      return `${base}?${qs.join("&")}`;
    },
    [token, streamKey]
  );

  /**
   * Misma URL pero con el token oculto, para poder mostrarla en pantalla.
   *
   * El token de sesión viaja en la query porque una etiqueta <img> no admite
   * cabeceras; imprimirlo tal cual dejaba una credencial válida a la vista en
   * capturas de pantalla y al compartir pantalla.
   */
  const getStreamUrlVisible = useCallback(
    (cameraId: string) => getStreamUrl(cameraId).replace(/token=[^&]+/, "token=•••oculto•••"),
    [getStreamUrl]
  );

  async function refresh() {
    try {
      const data = await listCameras();
      const normalized = Array.isArray(data) ? data.map(normalizeCamera) : [];
      setCameras(normalized);
    } catch (e: any) {
      console.error("listCameras error:", e?.response?.status, e?.message);
      toast.error("No se pudieron cargar las cámaras");
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await refresh();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // PAGINACIÓN
  const pageSize = 5;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(cameras.length / pageSize));

  useEffect(() => setPage((p) => Math.min(p, totalPages)), [totalPages]);

  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return cameras.slice(start, start + pageSize);
  }, [cameras, page]);

  const canPrev = page > 1;
  const canNext = page < totalPages;
  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));

  const handleStartStop = async (id: string, currentStatus: Camera["status"]) => {
    if (!isAdmin) {
      toast.error("No tienes permisos para iniciar/detener cámaras");
      return;
    }

    const nextStatus = currentStatus === "RUNNING" ? "STOPPED" : "RUNNING";
    setCameras((prev) => prev.map((cam) => (cam.id === id ? { ...cam, status: nextStatus } : cam)));

    try {
      if (currentStatus === "RUNNING") {
        await stopCamera(id);
        toast.success("🔴 Detenida");
      } else {
        await startCamera(id);
        toast.success("🟢 Iniciada");
      }
    } catch (e: any) {
      console.error("start/stop error:", e?.response?.status, e?.message);
      toast.error("No se pudo cambiar el estado");
      setCameras((prev) => prev.map((cam) => (cam.id === id ? { ...cam, status: currentStatus } : cam)));
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!isAdmin) {
      toast.error("No tienes permisos para eliminar cámaras");
      return;
    }

    const prev = cameras;
    setCameras((p) => p.filter((c) => c.id !== id));

    try {
      await deleteCamera(id);
      toast.success(`Cámara "${name}" eliminada`);
    } catch (e: any) {
      console.error("delete error:", e?.response?.status, e?.message);
      toast.error("No se pudo eliminar la cámara");
      setCameras(prev);
    }
  };

  const handleEdit = (camera: Camera) => {
    if (!isAdmin) {
      toast.error("No tienes permisos para editar cámaras");
      return;
    }

    setEditingCamera(camera);
    setFormData({
      name: camera.name,
      rtsp_url: camera.rtsp_url,
      enabled: camera.enabled,
      fps_target: camera.fps_target,
      infer_every_n_frames: camera.infer_every_n_frames,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error("No tienes permisos para guardar cámaras");
      return;
    }

    try {
      if (editingCamera) {
        await updateCamera(editingCamera.id, formData);
        toast.success("Cámara actualizada");
      } else {
        await createCamera(formData);
        toast.success("Cámara creada");
      }
      setIsDialogOpen(false);
      setEditingCamera(null);
      await refresh();
    } catch (e: any) {
      console.error("save camera error:", e?.response?.status, e?.message);
      toast.error("No se pudo guardar la cámara");
    }
  };

  const runningCameras = cameras.filter((c) => c.status === "RUNNING").length;
  const stoppedCameras = cameras.filter((c) => c.status === "STOPPED").length;

  // --- OPEN VIDEO MODAL ---
  const openVideo = (camera: Camera) => {
    setActiveVideoCamera(camera);
    setStreamError(null);
    setStreamKey(Date.now()); // nuevo stream
    setIsFullscreen(false);
    setIsVideoModalOpen(true);
  };

  const closeVideo = () => {
    // forzar que se “corte” el stream del <img>
    setStreamKey(Date.now());
    setIsVideoModalOpen(false);
    setActiveVideoCamera(null);
    setStreamError(null);
    setIsFullscreen(false);
  };

  const reloadStream = () => {
    setStreamError(null);
    setStreamKey(Date.now());
  };

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Cámaras</h1>
          <p className="text-sm text-slate-600">Monitoreo y administración de dispositivos</p>
          <p className="text-xs text-slate-500 mt-1">
            Rol actual: <span className="font-semibold">{user?.role ?? "—"}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refresh()}>
            Refrescar
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                disabled={!isAdmin}
                title={!isAdmin ? "Solo admin puede crear cámaras" : undefined}
                onClick={() => {
                  if (!isAdmin) return;
                  setEditingCamera(null);
                  setFormData({
                    name: "",
                    rtsp_url: "",
                    enabled: true,
                    fps_target: 30,
                    infer_every_n_frames: 5,
                  });
                }}
              >
                <Plus className="h-5 w-5 mr-2" /> Nueva Cámara
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-blue-600" />
                  {editingCamera ? "Editar Cámara" : "Nueva Cámara"}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Pasillo A"
                    required
                    disabled={!isAdmin}
                  />
                </div>

                <div className="space-y-2">
                  <Label>URL RTSP / Fuente</Label>
                  <Input
                    value={formData.rtsp_url}
                    onChange={(e) => setFormData({ ...formData, rtsp_url: e.target.value })}
                    placeholder="0 (local) o rtsp://..."
                    required
                    disabled={!isAdmin}
                  />
                  <p className="text-[11px] text-slate-500">
                    Nota: en servidor (Render) NO funciona webcam "0". Usa RTSP/IP cam.
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                  <Label>Habilitar detección</Label>
                  <Switch
                    checked={formData.enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>FPS objetivo</Label>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={formData.fps_target}
                      onChange={(e) => setFormData({ ...formData, fps_target: Number(e.target.value) })}
                      disabled={!isAdmin}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Infer cada N frames</Label>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={formData.infer_every_n_frames}
                      onChange={(e) =>
                        setFormData({ ...formData, infer_every_n_frames: Number(e.target.value) })
                      }
                      disabled={!isAdmin}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button type="submit" className="w-full" disabled={!isAdmin}>
                    {editingCamera ? "Actualizar" : "Crear"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm border-l-4 border-l-emerald-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500">ACTIVAS</p>
                <p className="text-2xl font-bold">{runningCameras}</p>
              </div>
              <Play className="h-5 w-5 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm border-l-4 border-l-slate-400">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500">DETENIDAS</p>
                <p className="text-2xl font-bold">{stoppedCameras}</p>
              </div>
              <Square className="h-5 w-5 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500">ACTIVIDAD</p>
                <p className="text-2xl font-bold">
                  {cameras.length ? Math.round((runningCameras / cameras.length) * 100) : 0}%
                </p>
              </div>
              <Activity className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TABLA */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="bg-slate-50/50 border-b">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-slate-500" />
            <CardTitle className="text-sm">Listado de Dispositivos</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">Cargando cámaras...</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14 text-center">N.º</TableHead>
                    <TableHead>Cámara</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {pageData.map((camera, i) => (
                    <TableRow key={camera.id}>
                      {/* Numeracion correlativa en lugar del ObjectId de Mongo,
                          que son 24 caracteres sin significado para el operador.
                          Se calcula sobre el total, no sobre la pagina, para que
                          la segunda pagina siga en 6 y no vuelva a empezar en 1. */}
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">
                        {String((page - 1) * pageSize + i + 1).padStart(2, "0")}
                      </TableCell>
                      <TableCell className="font-semibold">{camera.name}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={
                            camera.status === "RUNNING"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }
                        >
                          {camera.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right flex justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => openVideo(camera)}
                          disabled={camera.status === "STOPPED"}
                          title={camera.status === "STOPPED" ? "Inicia la cámara para ver stream" : undefined}
                        >
                          <Eye className="h-4 w-4 mr-1" /> Ver
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartStop(camera.id, camera.status)}
                          disabled={!isAdmin}
                          title={!isAdmin ? "Solo admin puede iniciar/detener" : undefined}
                        >
                          {camera.status === "RUNNING" ? (
                            <Square className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(camera)}
                          disabled={!isAdmin}
                          title={!isAdmin ? "Solo admin puede editar" : undefined}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="text-rose-600"
                          onClick={() => handleDelete(camera.id, camera.name)}
                          disabled={!isAdmin}
                          title={!isAdmin ? "Solo admin puede eliminar" : undefined}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="p-4 border-t flex items-center justify-between bg-slate-50/30">
                <span className="text-xs text-slate-500">
                  Página {page} de {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={goPrev} disabled={!canPrev}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={goNext} disabled={!canNext}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* MODAL STREAM MEJORADO */}
      <Dialog open={isVideoModalOpen} onOpenChange={(v) => (v ? setIsVideoModalOpen(true) : closeVideo())}>
        <DialogContent
          /* Este diálogo ya tiene su propio botón de cerrar junto a
             "Recargar" y "Pantalla completa": sin esto salían dos aspas. */
          showClose={false}
          className={
            isFullscreen
              ? "p-0 w-[100vw] h-[100vh] max-w-none rounded-none bg-white border-slate-200"
              : "sm:max-w-5xl bg-white border-slate-200"
          }
        >
          <DialogHeader className={isFullscreen ? "px-4 pt-4" : ""}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                {/* Punto rojo latiendo: señal universal de emisión en directo. */}
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-70" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                </span>
                <DialogTitle className="truncate text-sm font-semibold text-slate-900">
                  En vivo · {activeVideoCamera?.name ?? "—"}
                </DialogTitle>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Acción principal: sólida, para que destaque sobre el resto. */}
                <Button
                  size="sm"
                  className="bg-sky-700 text-white hover:bg-sky-800 shadow-sm"
                  onClick={reloadStream}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Recargar
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  onClick={() => setIsFullscreen((s) => !s)}
                  title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                  aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-300 text-slate-700 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                  onClick={closeVideo}
                  title="Cerrar"
                  aria-label="Cerrar"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className={isFullscreen ? "px-4 pb-4" : ""}>
            {/* El área de vídeo se mantiene oscura a propósito: una imagen de
                cámara se lee mejor sobre fondo neutro oscuro que sobre blanco. */}
            <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-200 shadow-inner">
              {/* Overlay error */}
              {streamError && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/95 p-6">
                  <div className="max-w-lg space-y-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      <p className="font-semibold text-slate-900">No se pudo cargar el vídeo</p>
                    </div>
                    <p className="text-sm text-slate-600 break-words">{streamError}</p>
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <Button
                        className="bg-sky-700 text-white hover:bg-sky-800"
                        onClick={reloadStream}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reintentar
                      </Button>
                      <Button
                        variant="outline"
                        className="border-slate-300 text-slate-700 hover:bg-slate-100"
                        onClick={closeVideo}
                      >
                        Cerrar
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {activeVideoCamera && (
                <img
                  key={streamKey} // fuerza reset
                  src={getStreamUrl(activeVideoCamera.id)}
                  alt="Live"
                  className="w-full h-full object-contain bg-slate-900"
                  onError={() => {
                    setStreamError(
                      "Revisa que la cámara esté encendida, que su URL RTSP tenga las " +
                        "credenciales correctas y que tu sesión no haya caducado."
                    );
                  }}
                />
              )}
            </div>

            {/* La URL del flujo es informacion de depuracion: ocupaba dos
                lineas bajo el video y no le dice nada al operador. Se muestra
                solo cuando algo falla, que es cuando sirve para diagnosticar,
                y siempre con el token enmascarado. */}
            {activeVideoCamera && streamError && (
              <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <summary className="cursor-pointer text-xs font-medium text-slate-600 hover:text-slate-900">
                  Detalles técnicos
                </summary>
                <code className="mt-2 block break-all font-mono text-[11px] leading-relaxed text-slate-500">
                  {getStreamUrlVisible(activeVideoCamera.id)}
                </code>
              </details>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}