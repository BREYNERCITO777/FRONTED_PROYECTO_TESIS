import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../shared/ui/card";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import {
  Camera,
  Activity,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Eye,
  MapPin,
  ChevronRight,
  ShieldCheck,
  AlertOctagon,
  ChevronLeft,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../shared/ui/table";

import { listCameras } from "../../../api/cameras";
import { listAlerts } from "../../../api/alerts";
import { listIncidents } from "../../../api/incidents";

type UiRecentItem = {
  id: string | number;
  weaponType: string;
  confidence: number; // 0..1
  camera: string;
  cameraName?: string;
  location?: string;
  timestamp: string;
  date: string;
  severity: "low" | "medium" | "high" | "critical";
};

export function Dashboard() {
  // ✅ PAGINACIÓN
  const pageSize = 10;
  const [page, setPage] = useState(1);

  // ✅ DATA BACKEND
  const [loading, setLoading] = useState(true);
  const [cameras, setCameras] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [cams, als, inc] = await Promise.all([listCameras(), listAlerts(), listIncidents()]);
        setCameras(Array.isArray(cams) ? cams : []);
        setAlerts(Array.isArray(als) ? als : []);
        setIncidents(Array.isArray(inc) ? inc : []);
      } catch (e: any) {
        console.error("Dashboard API error:", e?.response?.status, e?.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const recentActivity: UiRecentItem[] = useMemo(() => {
    const sorted = [...alerts].sort((a, b) => {
      const ta = new Date(a.created_at || a.timestamp || 0).getTime();
      const tb = new Date(b.created_at || b.timestamp || 0).getTime();
      return tb - ta;
    });

    return sorted.map((a: any, idx: number) => {
      const t = new Date(a.created_at || a.timestamp || Date.now());
      const confidenceRaw = a.confidence ?? a.score ?? 0;
      const confidence = confidenceRaw > 1 ? confidenceRaw / 100 : confidenceRaw; // 0-100 o 0-1

      const sev =
        a.severity ||
        (confidence >= 0.9 ? "critical" : confidence >= 0.8 ? "high" : confidence >= 0.7 ? "medium" : "low");

      return {
        id: a.id ?? idx,
        weaponType: a.weapon_type || a.type || a.label || "Detección",
        confidence: Math.max(0, Math.min(1, Number(confidence) || 0)),
        camera: String(a.camera_code || a.camera_id || a.camera || "CAM-?"),
        cameraName: a.camera_name || a.cameraName || "",
        location: a.location || a.zone || "",
        timestamp: Number.isFinite(t.getTime()) ? t.toLocaleTimeString() : "",
        date: Number.isFinite(t.getTime()) ? t.toLocaleDateString() : "",
        severity: sev,
      };
    });
  }, [alerts]);

  // KPIs dinámicos
  const totalCameras = cameras.length;

  const activeCameras = cameras.filter((c: any) => {
    if (typeof c.is_active === "boolean") return c.is_active;
    if (typeof c.active === "boolean") return c.active;
    if (typeof c.status === "string") return c.status.toLowerCase() === "active";
    return false;
  }).length;

  const today = new Date();
  const isToday = (d: Date) =>
    d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();

  const incidentsToday = incidents.filter((i: any) => {
    const t = new Date(i.created_at || i.timestamp || 0);
    return Number.isFinite(t.getTime()) && isToday(t);
  }).length;

  const lastAlert = recentActivity[0];

  const kpiData = [
    {
      title: "Cámaras Registradas",
      value: String(totalCameras),
      subtitle: "Total en sistema",
      change: "",
      trend: "neutral" as const,
      icon: Camera,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Cámaras Activas",
      value: String(activeCameras),
      subtitle: `${Math.max(0, totalCameras - activeCameras)} inactivas`,
      change: totalCameras ? `${Math.round((activeCameras / totalCameras) * 100)}%` : "0%",
      trend: "neutral" as const,
      icon: Activity,
      color: "text-emerald-600",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Incidentes Hoy",
      value: String(incidentsToday),
      subtitle: "Hoy",
      change: "",
      trend: "neutral" as const,
      icon: AlertTriangle,
      color: "text-amber-600",
      bgColor: "bg-amber-500/10",
    },
    {
      title: "Última Alerta",
      value: lastAlert ? "Reciente" : "—",
      subtitle: lastAlert ? String(lastAlert.camera) : "Sin alertas",
      change: "",
      trend: "neutral" as const,
      icon: Clock,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
  ];

  const totalPages = Math.max(1, Math.ceil(recentActivity.length / pageSize));

  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return recentActivity.slice(start, start + pageSize);
  }, [page, recentActivity]);

  // Si cambian los datos y la página queda fuera, reajusta
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages]);

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando Dashboard...</div>;
  }

  return (
    <div className="w-full h-full flex flex-col gap-4 text-foreground animate-in fade-in duration-500 overflow-hidden">
      {/* 1. Header (más compacto) */}
      <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Panel de Control</h1>
          <p className="text-muted-foreground text-xs md:text-sm">
            Monitoreo en tiempo real del sistema de detección inteligente
          </p>
        </div>
        <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2 shadow-sm self-start md:self-center">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Sistema Activo</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="text-right leading-tight">
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Última Sync</p>
            <p className="text-[11px] font-bold">Live</p>
          </div>
        </div>
      </div>

      {/* 2. KPI (más compactas) */}
      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {kpiData.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title} className="bg-card border-border shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={`${kpi.bgColor} p-2 rounded-lg`}>
                    <Icon className={`h-4 w-4 ${kpi.color}`} />
                  </div>

                  {kpi.trend !== "neutral" && (
                    <div
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                        kpi.trend === "up"
                          ? "text-emerald-600 bg-emerald-50 border-emerald-100"
                          : "text-destructive bg-destructive/5 border-destructive/10"
                      }`}
                    >
                      {kpi.trend === "up" ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {kpi.change}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                    {kpi.title}
                  </p>
                  <p className="text-2xl font-bold truncate">{kpi.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 font-medium">{kpi.subtitle}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 3. Alerta Crítica (compacta) */}
      <div className="shrink-0 w-full rounded-2xl border border-destructive/20 bg-gradient-to-br from-destructive/5 via-card to-destructive/5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 px-5 py-4">
          <div className="hidden lg:flex h-10 w-10 items-center justify-center rounded-2xl bg-destructive text-white shadow-md shadow-destructive/20">
            <AlertOctagon className="h-5 w-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive lg:hidden mt-0.5 shrink-0" />
              <div className="min-w-0">
                <h3 className="text-base font-bold text-destructive leading-tight truncate">
                  {lastAlert ? `Última detección: ${lastAlert.weaponType}` : "Sin alertas recientes"}
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  {lastAlert
                    ? "Revisa evidencia y toma acción."
                    : "Cuando existan alertas, aquí verás la más reciente."}
                </p>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              <Badge className="bg-destructive hover:bg-destructive font-bold px-2.5 py-0.5 text-[11px] text-destructive-foreground">
                {lastAlert ? lastAlert.weaponType : "—"}
              </Badge>
              <Badge
                variant="outline"
                className="bg-background border-destructive/20 text-destructive font-bold px-2.5 py-0.5 text-[11px]"
              >
                {lastAlert ? `${Math.round(lastAlert.confidence * 100)}% Confianza` : "—"}
              </Badge>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { icon: Camera, label: "Cámara", val: lastAlert ? lastAlert.camera : "—" },
                { icon: MapPin, label: "Zona", val: lastAlert ? (lastAlert.location || "—") : "—" },
                { icon: Clock, label: "Hora", val: lastAlert ? lastAlert.timestamp : "—" },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-muted/20 px-3 py-2 rounded-xl border border-border/40 overflow-hidden"
                >
                  <item.icon size={14} className="text-destructive shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">
                      {item.label}
                    </p>
                    <p className="text-xs font-bold truncate">{item.val}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-row lg:flex-col gap-2 w-full lg:w-auto lg:shrink-0">
            <Button
              size="sm"
              className="flex-1 lg:flex-none bg-destructive hover:bg-destructive/90 text-white font-bold h-9 px-4"
              disabled={!lastAlert}
              onClick={() => {
                if (!lastAlert) return;
                console.log("Ver evidencia de alerta:", lastAlert.id);
              }}
            >
              Evidencia
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 lg:flex-none h-9 px-4 font-bold bg-background"
              disabled={!lastAlert}
              onClick={() => {
                if (!lastAlert) return;
                console.log("Ignorar alerta:", lastAlert.id);
              }}
            >
              Ignorar
            </Button>
          </div>
        </div>
      </div>

      {/* 4. Actividad Reciente + Distribución */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tabla */}
        <Card className="lg:col-span-2 border-border shadow-sm flex flex-col min-h-0">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 px-5 py-3 shrink-0">
            <div className="flex items-center gap-2 text-card-foreground">
              <Activity className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-bold">Actividad Reciente</CardTitle>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs font-bold text-primary hover:bg-primary/5"
              onClick={() => console.log("Ir a historial")}
            >
              Historial <ChevronRight size={14} />
            </Button>
          </CardHeader>

          <CardContent className="p-0 flex-1 min-h-0">
            <div className="h-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30 border-b">
                    <TableHead className="font-bold text-[10px] uppercase tracking-wider px-5">Detección</TableHead>
                    <th className="px-5 py-3 text-left font-bold text-[10px] uppercase tracking-wider text-muted-foreground">
                      IA
                    </th>
                    <TableHead className="font-bold text-[10px] uppercase tracking-wider px-5">Cámara</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-wider px-5 text-center">
                      Nivel
                    </TableHead>
                    <TableHead className="text-right font-bold text-[10px] uppercase tracking-wider px-5">
                      Acción
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {pageData.length === 0 ? (
                    <TableRow>
                      <TableCell className="px-5 py-6 text-sm text-muted-foreground" colSpan={5}>
                        No hay actividad reciente.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageData.map((incident) => (
                      <TableRow
                        key={incident.id}
                        className="hover:bg-muted/10 transition-colors border-b last:border-0 group"
                      >
                        <TableCell className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-2 w-2 rounded-full shrink-0 ${
                                incident.severity === "critical"
                                  ? "bg-destructive animate-pulse"
                                  : incident.severity === "high"
                                  ? "bg-orange-500"
                                  : incident.severity === "medium"
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                            />
                            <span className="text-sm font-bold truncate max-w-[160px]">{incident.weaponType}</span>
                          </div>
                        </TableCell>

                        <TableCell className="px-5 py-3">
                          <span className="text-xs font-mono font-bold">{(incident.confidence * 100).toFixed(0)}%</span>
                        </TableCell>

                        <TableCell className="px-5 py-3">
                          <p className="text-xs font-bold truncate max-w-[180px]">{incident.camera}</p>
                          <p className="text-[10px] text-muted-foreground">{incident.timestamp}</p>
                        </TableCell>

                        <TableCell className="px-5 py-3 text-center">
                          <Badge
                            variant="outline"
                            className={`text-[9px] font-bold uppercase ${
                              incident.severity === "critical"
                                ? "bg-destructive/10 text-destructive border-destructive/20"
                                : "bg-muted text-foreground"
                            }`}
                          >
                            {incident.severity}
                          </Badge>
                        </TableCell>

                        <TableCell className="px-5 py-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => console.log("Ver detalle:", incident.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>

          <div className="shrink-0 border-t px-5 py-2.5 bg-white flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium">
              Mostrando{" "}
              <span className="font-bold text-slate-900">{recentActivity.length ? (page - 1) * pageSize + 1 : 0}</span>
              {" - "}
              <span className="font-bold text-slate-900">{Math.min(page * pageSize, recentActivity.length)}</span> de{" "}
              <span className="font-bold text-slate-900">{recentActivity.length}</span>
            </p>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8" onClick={goPrev} disabled={!canPrev}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>

              <div className="text-xs font-bold px-2">
                {page} / {totalPages}
              </div>

              <Button variant="outline" size="sm" className="h-8" onClick={goNext} disabled={!canNext}>
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Distribución */}
        <div className="min-h-0">
          <Card className="border-border shadow-sm bg-card text-card-foreground h-full flex flex-col">
            <CardHeader className="pb-2 border-b px-5 py-3 shrink-0">
              <CardTitle className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck size={16} className="text-primary" /> Distribución
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-4 px-5 space-y-3">
              {[
                { label: "Pistola", val: 75, color: "bg-primary" },
                { label: "Rifle", val: 15, color: "bg-indigo-500" },
                { label: "Cuchillo", val: 10, color: "bg-amber-500" },
              ].map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span>{item.label}</span>
                    <span className="text-muted-foreground">{item.val}%</span>
                  </div>
                  <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                    <div className={`${item.color} h-full rounded-full transition-all`} style={{ width: `${item.val}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}