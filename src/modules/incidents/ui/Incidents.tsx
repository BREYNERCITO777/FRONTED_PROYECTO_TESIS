import React, { useState, useMemo, useEffect } from "react";
import {
  Eye,
  Filter,
  AlertTriangle,
  Download,
  Camera,
  Calendar,
  Shield,
  Search,
  MoreHorizontal,
  X,
  FileText,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";

import { listIncidents, deleteIncident } from "../../../api/incidents";
import { useAuth } from "../../../context/auth-context";
import { toast } from "sonner";

// --- Interfaces ---
interface Incident {
  id: string;
  weapon_type: string;
  confidence: number; // 0..1
  timestamp: string;
  date: string;
  time: string;
  camera_id: string;
  camera_name: string;
  image_url: string;
  severity: "critical" | "high" | "medium" | "low";
}

// Base para assets (si luego sirves imágenes desde /static)
const PUBLIC_BASE = (process.env.REACT_APP_API_BASE || "http://localhost:8000/api/v1").replace(
  /\/api\/v1$/,
  ""
);

// Normaliza lo que venga del backend a tu UI
function normalizeIncident(raw: any): Incident {
  const id = String(raw._id ?? raw.id ?? raw.incident_id ?? "INC-???");

  const weapon_type = String(raw.weapon_type ?? raw.type ?? raw.label ?? "Detección");

  const confRaw = raw.confidence ?? raw.score ?? 0;
  const confidence = confRaw > 1 ? Number(confRaw) / 100 : Number(confRaw);
  const safeConfidence = Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0;

  const camera_id = String(raw.camera_id ?? raw.camera ?? raw.cameraCode ?? "CAM-?");
  const camera_name = String(raw.camera_name ?? raw.cameraName ?? "—");

  const created = raw.created_at ?? raw.timestamp ?? raw.createdAt ?? null;
  const dt = created ? new Date(created) : new Date();

  const date = Number.isFinite(dt.getTime()) ? dt.toLocaleDateString() : "";
  const time = Number.isFinite(dt.getTime()) ? dt.toLocaleTimeString() : "";
  const timestamp = created ? String(created) : `${date} ${time}`;

  // Evidencia / imagen
  const img = raw.image_url ?? raw.snapshot_url ?? raw.evidence_url ?? "";
  const image_url =
    typeof img === "string" && img.startsWith("/") ? `${PUBLIC_BASE}${img}` : String(img || "");

  // Severidad
  const sev =
    raw.severity ||
    (safeConfidence >= 0.9
      ? "critical"
      : safeConfidence >= 0.8
      ? "high"
      : safeConfidence >= 0.7
      ? "medium"
      : "low");

  return {
    id,
    weapon_type,
    confidence: safeConfidence,
    timestamp,
    date,
    time,
    camera_id,
    camera_name,
    image_url,
    severity: sev,
  };
}

export const Incidents = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [loading, setLoading] = useState(true);

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCamera, setFilterCamera] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ✅ PAGINACIÓN (5 en 5)
  const pageSize = 5;
  const [page, setPage] = useState(1);

  async function refresh() {
    try {
      const data = await listIncidents(500);
      const normalized = Array.isArray(data) ? data.map(normalizeIncident) : [];
      normalized.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
      setIncidents(normalized);
    } catch (e: any) {
      console.error("listIncidents error:", e?.response?.status, e?.message);
      setIncidents([]);
      toast.error("No se pudieron cargar los incidentes");
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await refresh();
      setLoading(false);
    })();
  }, []);

  const uniqueCameras = useMemo(() => {
    const map = new Map<string, string>();
    incidents.forEach((inc) => {
      if (!map.has(inc.camera_id)) map.set(inc.camera_id, inc.camera_name);
    });
    return Array.from(map.entries());
  }, [incidents]);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      const matchesSearch =
        inc.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inc.weapon_type.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCamera = filterCamera === "all" || inc.camera_id === filterCamera;
      const matchesSeverity = filterSeverity === "all" || inc.severity === filterSeverity;

      return matchesSearch && matchesCamera && matchesSeverity;
    });
  }, [incidents, searchTerm, filterCamera, filterSeverity]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterCamera, filterSeverity]);

  const totalPages = Math.max(1, Math.ceil(filteredIncidents.length / pageSize));

  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredIncidents.slice(start, start + pageSize);
  }, [filteredIncidents, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "high":
        return "bg-orange-500/10 text-orange-600 border-orange-500/20";
      case "medium":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const stats = useMemo(
    () => ({
      total: filteredIncidents.length,
      critical: filteredIncidents.filter((i) => i.severity === "critical").length,
      avgConfidence:
        filteredIncidents.length > 0
          ? (
              (filteredIncidents.reduce((acc, curr) => acc + curr.confidence, 0) /
                filteredIncidents.length) *
              100
            ).toFixed(0)
          : "0",
    }),
    [filteredIncidents]
  );

  const startLabel = filteredIncidents.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const endLabel = Math.min(page * pageSize, filteredIncidents.length);

  const handleDeleteSelected = async () => {
    if (!selectedIncident) return;

    if (!isAdmin) {
      toast.error("No tienes permisos para eliminar incidentes");
      return;
    }

    setDeleting(true);
    try {
      await deleteIncident(selectedIncident.id);
      toast.success("Incidente eliminado");
      setSelectedIncident(null);
      await refresh();
    } catch (e: any) {
      console.error("deleteIncident error:", e?.response?.status, e?.message);
      toast.error("No se pudo eliminar el incidente (solo admin)");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-10 text-foreground">
      {/* 1. Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Registro de Incidentes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestión y auditoría de detecciones de seguridad
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Rol: <span className="font-bold text-foreground">{user?.role ?? "—"}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refresh()}
            className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary text-secondary-foreground rounded-lg border border-border text-sm font-bold hover:bg-secondary/80 transition-all shadow-sm"
          >
            <Download size={18} /> <span className="hidden sm:inline">Refrescar</span>
          </button>

          {/* ❌ QUITADO: "Limpiar" / deleteAllIncidents */}
        </div>
      </div>

      {/* 2. Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total", val: stats.total, icon: AlertTriangle, color: "text-primary", bg: "bg-primary/10" },
          { label: "Críticos", val: stats.critical, icon: Shield, color: "text-destructive", bg: "bg-destructive/10" },
          { label: "IA Estable", val: `${stats.avgConfidence}%`, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "Cámaras", val: uniqueCameras.length, icon: Camera, color: "text-indigo-500", bg: "bg-indigo-500/10" },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-card p-5 rounded-lg border border-border shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow"
          >
            <div className={`p-3 rounded-md ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-2xl font-bold text-card-foreground">{stat.val}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Filtros */}
      <div className="bg-card p-4 rounded-lg border border-border shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar por ID o tipo de arma..."
              className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-ring outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-background px-3 py-1 rounded-md border border-input">
              <Filter size={14} className="text-muted-foreground" />
              <select
                className="bg-transparent border-none text-xs font-bold text-foreground outline-none py-1.5 cursor-pointer"
                value={filterCamera}
                onChange={(e) => setFilterCamera(e.target.value)}
              >
                <option value="all">Cámaras: Todas</option>
                {uniqueCameras.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-background px-3 py-1 rounded-md border border-input">
              <Shield size={14} className="text-muted-foreground" />
              <select
                className="bg-transparent border-none text-xs font-bold text-foreground outline-none py-1.5 cursor-pointer"
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
              >
                <option value="all">Severidad: Todas</option>
                <option value="critical">Crítica</option>
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Tabla (paginada) */}
      <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                <th className="px-6 py-4">Incidente</th>
                <th className="px-6 py-4">Detección</th>
                <th className="px-6 py-4">Confianza IA</th>
                <th className="px-6 py-4">Ubicación</th>
                <th className="px-6 py-4">Nivel</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {pageData.map((incident) => (
                <tr key={incident.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="font-mono font-bold text-foreground text-sm">{incident.id}</span>
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                      <Calendar size={10} /> {incident.date} · {incident.time}
                    </p>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          incident.severity === "critical" ? "bg-destructive animate-pulse" : "bg-primary"
                        }`}
                      />
                      <span className="text-sm font-bold text-foreground">{incident.weapon_type}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-[70px] bg-muted h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-700 ${
                            incident.confidence > 0.9 ? "bg-emerald-500" : "bg-primary"
                          }`}
                          style={{ width: `${incident.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono font-bold text-foreground">
                        {(incident.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-foreground block">{incident.camera_name}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">{incident.camera_id}</span>
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border shadow-sm ${getSeverityStyles(
                        incident.severity
                      )}`}
                    >
                      {incident.severity}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right space-x-1">
                    <button
                      onClick={() => setSelectedIncident(incident)}
                      className="p-2 text-muted-foreground hover:text-primary hover:bg-accent rounded-md transition-all inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
                    >
                      <Eye size={16} /> <span className="hidden xl:inline">Detalles</span>
                    </button>
                    <button className="p-2 text-muted-foreground hover:text-foreground rounded-md transition-all">
                      <MoreHorizontal size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {loading && (
            <div className="py-20 text-center space-y-3 bg-card">
              <p className="text-muted-foreground font-medium">Cargando incidentes...</p>
            </div>
          )}

          {!loading && filteredIncidents.length === 0 && (
            <div className="py-20 text-center space-y-3 bg-card">
              <div className="inline-flex p-4 bg-muted rounded-full text-muted-foreground">
                <Search size={32} />
              </div>
              <p className="text-muted-foreground font-medium">No se encontraron resultados para tu búsqueda</p>
            </div>
          )}
        </div>

        {/* ✅ Footer paginación */}
        {filteredIncidents.length > 0 && (
          <div className="border-t border-border px-6 py-3 bg-card flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium">
              Mostrando <span className="font-bold text-foreground">{startLabel}</span>
              {" - "}
              <span className="font-bold text-foreground">{endLabel}</span> de{" "}
              <span className="font-bold text-foreground">{filteredIncidents.length}</span>
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={goPrev}
                disabled={!canPrev}
                className={`inline-flex items-center gap-1 px-3 py-2 rounded-md border text-xs font-bold transition-all ${
                  canPrev
                    ? "bg-background hover:bg-muted border-border text-foreground"
                    : "bg-muted/40 border-border text-muted-foreground cursor-not-allowed"
                }`}
              >
                <ChevronLeft size={16} />
                Anterior
              </button>

              <div className="text-xs font-bold px-2">
                {page} / {totalPages}
              </div>

              <button
                onClick={goNext}
                disabled={!canNext}
                className={`inline-flex items-center gap-1 px-3 py-2 rounded-md border text-xs font-bold transition-all ${
                  canNext
                    ? "bg-background hover:bg-muted border-border text-foreground"
                    : "bg-muted/40 border-border text-muted-foreground cursor-not-allowed"
                }`}
              >
                Siguiente
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Modal Detalle */}
      {selectedIncident && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden relative border border-border">
            <button
              onClick={() => setSelectedIncident(null)}
              className="absolute top-4 right-4 p-2 bg-muted text-muted-foreground hover:text-foreground rounded-full z-10"
            >
              <X size={20} />
            </button>

            <div className="p-8 space-y-6">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <div className="p-2 bg-destructive/10 text-destructive rounded-lg">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Incidente {selectedIncident.id}</h2>
                  <p className="text-sm text-muted-foreground">{selectedIncident.timestamp}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1 tracking-widest">
                    Detección
                  </p>
                  <p className="font-bold text-foreground">{selectedIncident.weapon_type}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1 tracking-widest">Cámara</p>
                  <p className="font-bold text-foreground">{selectedIncident.camera_name}</p>
                </div>
              </div>

              <div className="bg-black rounded-lg overflow-hidden shadow-inner border border-border relative">
                <div className="w-full max-h-[60vh] flex items-center justify-center">
                  <img
                    src={selectedIncident.image_url}
                    alt="Captura de evidencia"
                    className="w-full h-auto max-h-[60vh] object-contain"
                  />
                </div>

                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm">
                  {selectedIncident.camera_id}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <button className="flex-1 py-2.5 bg-primary text-primary-foreground font-bold rounded-md shadow-md hover:bg-primary/90 transition-all">
                  Descargar Evidencia
                </button>

                {/* ✅ SOLO ADMIN: eliminar por ID */}
                {isAdmin && (
                  <button
                    onClick={handleDeleteSelected}
                    disabled={deleting}
                    className={`flex-1 py-2.5 font-bold rounded-md transition-all inline-flex items-center justify-center gap-2 ${
                      deleting
                        ? "bg-destructive/60 text-white cursor-not-allowed"
                        : "bg-destructive text-white hover:bg-destructive/90"
                    }`}
                    title="Eliminar incidente por ID"
                  >
                    <Trash2 size={18} />
                    {deleting ? "Eliminando..." : "Eliminar"}
                  </button>
                )}

                <button
                  onClick={() => setSelectedIncident(null)}
                  className="flex-1 py-2.5 bg-secondary text-secondary-foreground font-bold rounded-md hover:bg-secondary/80 transition-all"
                >
                  Cerrar
                </button>
              </div>

              {!isAdmin && (
                <p className="text-xs text-muted-foreground">
                  Nota: con rol <span className="font-bold">operator</span> solo puedes visualizar incidentes.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Incidents;