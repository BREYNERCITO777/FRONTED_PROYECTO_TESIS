import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent } from "../../../shared/ui/card";
import { Button } from "../../../shared/ui/button";
import { Badge } from "../../../shared/ui/badge";
import { Download, Eye, Camera, Calendar, Image as ImageIcon, X } from "lucide-react";
import { http } from "../../../api/http"; // ✅ axios con interceptor Bearer

type Severity = "critical" | "high" | "medium" | "low";

interface IncidentApi {
  _id: string;
  weapon_type?: string;
  confidence?: number; // puede ser 0..1 o 0..100
  evidence_url?: string | null;
  camera_id?: string | null;
  timestamp?: string | null; // ISO
  created_at?: string | null; // por si acaso
}

interface EvidenceItem {
  id: string;
  weaponType: string;
  confidence: number; // 0..1
  evidenceUrl: string;
  cameraId: string;
  timestampISO: string;
  severity: Severity;
}

/**
 * API_BASE: se usa para las peticiones (http ya tiene baseURL internamente)
 * PUBLIC_BASE: se usa para convertir "/static/..." a URL absoluta.
 *
 * Si REACT_APP_API_BASE = "https://tuservicio.onrender.com/api/v1"
 * entonces PUBLIC_BASE = "https://tuservicio.onrender.com"
 */
const API_BASE =
  (process as any).env?.REACT_APP_API_BASE ||
  (import.meta as any).env?.VITE_API_URL ||
  "http://localhost:8000/api/v1";

const PUBLIC_BASE = String(API_BASE).replace(/\/api\/v1\/?$/, "");

function toAbsoluteEvidenceUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${PUBLIC_BASE}${url}`;
  return `${PUBLIC_BASE}/${url}`;
}

function normalizeConfidence(c: any): number {
  const n = Number(c);
  if (!Number.isFinite(n)) return 0;
  const v = n > 1 ? n / 100 : n; // soporta 0..100
  return Math.max(0, Math.min(1, v));
}

function severityFromConfidence(conf: number): Severity {
  if (conf >= 0.95) return "critical";
  if (conf >= 0.85) return "high";
  if (conf >= 0.70) return "medium";
  return "low";
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return { date: "-", time: "-" };

  const date = d.toLocaleDateString("es-PE");
  const time = d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return { date, time };
}

function ymd(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function Evidence() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // paginación
  const pageSize = 9;
  const [page, setPage] = useState(1);

  // modal
  const [selected, setSelected] = useState<EvidenceItem | null>(null);

  const fetchEvidence = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // ✅ axios manda Authorization automáticamente
      const { data } = await http.get<IncidentApi[]>(`/incidents?limit=500`);

      const mapped: EvidenceItem[] = (Array.isArray(data) ? data : [])
        .filter((i) => !!i.evidence_url)
        .map((i) => {
          const conf = normalizeConfidence(i.confidence);
          const ts = String(i.timestamp ?? i.created_at ?? new Date().toISOString());
          return {
            id: String(i._id),
            weaponType: String(i.weapon_type ?? "desconocido"),
            confidence: conf,
            evidenceUrl: toAbsoluteEvidenceUrl(String(i.evidence_url ?? "")),
            cameraId: i.camera_id ? String(i.camera_id) : "—",
            timestampISO: ts,
            severity: severityFromConfidence(conf),
          };
        })
        // ✅ más reciente primero
        .sort((a, b) => String(b.timestampISO).localeCompare(String(a.timestampISO)));

      setItems(mapped);
      setPage(1);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401) setError("HTTP 401: sesión expirada o token no enviado. Vuelve a iniciar sesión.");
      else setError(e?.message || "Error cargando evidencias");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvidence().catch(console.error);
  }, [fetchEvidence]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(items.length / pageSize)), [items.length]);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page]);

  const stats = useMemo(() => {
    const total = items.length;

    const todayYMD = (() => {
      const d = new Date();
      const yyyy = String(d.getFullYear());
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    })();

    const todayCount = items.filter((i) => ymd(i.timestampISO) === todayYMD).length;

    const avg = total > 0 ? Math.round((items.reduce((acc, it) => acc + it.confidence, 0) / total) * 100) : 0;

    return { total, todayCount, avg };
  }, [items]);

  const downloadFile = (url: string, filename: string) => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const severityBadge = (s: Severity) => {
    switch (s) {
      case "critical":
        return "bg-rose-600 text-white";
      case "high":
        return "bg-orange-600 text-white";
      case "medium":
        return "bg-amber-600 text-white";
      default:
        return "bg-slate-600 text-white";
    }
  };

  const startLabel = items.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const endLabel = Math.min(page * pageSize, items.length);

  return (
    <div className="w-full space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Galería de Evidencias</h1>
          <p className="text-slate-600 text-sm mt-1">Capturas visuales de todas las detecciones registradas</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-10" onClick={fetchEvidence} disabled={loading}>
            {loading ? "Cargando..." : "Refrescar"}
          </Button>

          <Button
            className="h-10"
            onClick={() => pageData.forEach((it) => downloadFile(it.evidenceUrl, `evidence-${it.id}.jpg`))}
            disabled={pageData.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Descargar Página
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="py-5 px-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600">Total de Evidencias</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-2xl">
              <ImageIcon className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="py-5 px-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600">Hoy</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{stats.todayCount}</p>
            </div>
            <div className="bg-emerald-100 p-3 rounded-2xl">
              <Calendar className="h-6 w-6 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="py-5 px-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600">Confianza Promedio</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{stats.avg}%</p>
            </div>
            <div className="bg-amber-100 p-3 rounded-2xl">
              <span className="font-extrabold text-amber-700">AI</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error */}
      {error && <div className="p-4 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm">{error}</div>}

      {/* Empty */}
      {!loading && items.length === 0 && !error && <div className="py-16 text-center text-slate-600">No hay evidencias todavía.</div>}

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {pageData.map((it) => {
          const { date, time } = formatDateTime(it.timestampISO);
          const confPct = Math.round(it.confidence * 100);

          return (
            <Card key={it.id} className="border-0 shadow-sm overflow-hidden">
              <div className="relative bg-black">
                <img
                  src={it.evidenceUrl}
                  alt={`evidence-${it.id}`}
                  className="w-full h-44 object-cover"
                  loading="lazy"
                  onError={(ev) => {
                    // fallback simple si falla la imagen
                    (ev.currentTarget as HTMLImageElement).style.opacity = "0.2";
                  }}
                />

                <Badge className={`absolute top-3 right-3 ${severityBadge(it.severity)} shadow-sm`}>{confPct}%</Badge>
              </div>

              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono font-bold text-slate-900 truncate">{it.id}</p>
                  <Badge variant="outline" className="font-bold text-xs">
                    {it.weaponType}
                  </Badge>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="font-mono">
                      {date} {time}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    <span className="font-mono">{it.cameraId}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button variant="outline" onClick={() => setSelected(it)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Ver
                  </Button>
                  <Button onClick={() => downloadFile(it.evidenceUrl, `evidence-${it.id}.jpg`)}>
                    <Download className="h-4 w-4 mr-2" />
                    Descargar
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Footer paginación */}
      {items.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t pt-4">
          <p className="text-xs text-slate-600">
            Mostrando <span className="font-bold text-slate-900">{startLabel}</span> -{" "}
            <span className="font-bold text-slate-900">{endLabel}</span> de{" "}
            <span className="font-bold text-slate-900">{items.length}</span>
          </p>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!canPrev}>
              Anterior
            </Button>

            <div className="text-xs font-bold px-2">
              {page} / {totalPages}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={!canNext}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Modal Ver */}
      {selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden relative">
            <button
              onClick={() => setSelected(null)}
              className="absolute top-3 right-3 h-10 w-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
            >
              <X className="h-5 w-5 text-slate-700" />
            </button>

            <div className="p-5 border-b">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-900 truncate">Evidencia {selected.id}</h2>
                <p className="text-sm text-slate-600">
                  {selected.weaponType} · {Math.round(selected.confidence * 100)}% · Cámara: {selected.cameraId}
                </p>
              </div>
            </div>

            <div className="p-5">
              <div className="bg-black rounded-xl overflow-hidden border">
                <img src={selected.evidenceUrl} alt="evidence-full" className="w-full max-h-[70vh] object-contain bg-black" />
              </div>

              <div className="flex gap-3 pt-4">
                <Button className="flex-1" onClick={() => downloadFile(selected.evidenceUrl, `evidence-${selected.id}.jpg`)}>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setSelected(null)}>
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Evidence;