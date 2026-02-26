import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "../../../shared/ui/card";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../../shared/ui/tabs";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Camera,
  Shield,
  Bell,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Trash2,
  RefreshCw,
} from "lucide-react";

import { useAlerts } from "../../../app/providers/alerts-context";
import { useAuth } from "../../../context/auth-context";

type Tab = "all" | "unread" | "read";

export function Alerts() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // ✅ ahora ya viene tipado desde el provider
  const { alerts, unreadCount, refresh, markAsRead, markAllAsRead, deleteAlert } = useAlerts();

  const [activeTab, setActiveTab] = useState<Tab>("all");

  // paginación
  const pageSize = 4;
  const [page, setPage] = useState(1);

  const readCount = useMemo(() => alerts.filter((a) => a.read).length, [alerts]);
  const criticalCount = useMemo(() => alerts.filter((a) => a.severity === "critical").length, [alerts]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (activeTab === "unread") return !a.read;
      if (activeTab === "read") return !!a.read;
      return true;
    });
  }, [alerts, activeTab]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredAlerts.length / pageSize)),
    [filteredAlerts.length]
  );

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));

  useEffect(() => setPage(1), [activeTab]);
  useEffect(() => setPage((p) => Math.min(p, totalPages)), [totalPages]);

  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAlerts.slice(start, start + pageSize);
  }, [filteredAlerts, page]);

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return { date: "-", time: "-" };
    const d = new Date(iso);
    const date = d.toLocaleDateString();
    const time = d.toLocaleTimeString();
    return { date, time };
  };

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case "critical":
        return {
          badge: "bg-rose-600 text-white",
          cardBorder: "border-l-4 border-l-rose-500",
          cardBg: "bg-gradient-to-r from-rose-50/80 to-white",
          icon: <AlertTriangle className="h-4 w-4 text-rose-600" />,
          iconBg: "bg-rose-100",
          label: "Crítica",
          pulseEffect: "animate-pulse",
        };
      case "high":
        return {
          badge: "bg-orange-600 text-white",
          cardBorder: "border-l-4 border-l-orange-500",
          cardBg: "bg-white",
          icon: <AlertTriangle className="h-4 w-4 text-orange-600" />,
          iconBg: "bg-orange-100",
          label: "Alta",
          pulseEffect: "",
        };
      case "medium":
        return {
          badge: "bg-amber-600 text-white",
          cardBorder: "border-l-4 border-l-amber-500",
          cardBg: "bg-white",
          icon: <Shield className="h-4 w-4 text-amber-600" />,
          iconBg: "bg-amber-100",
          label: "Media",
          pulseEffect: "",
        };
      default:
        return {
          badge: "bg-slate-600 text-white",
          cardBorder: "border-l-4 border-l-slate-400",
          cardBg: "bg-white",
          icon: <Shield className="h-4 w-4 text-slate-600" />,
          iconBg: "bg-slate-100",
          label: "Baja",
          pulseEffect: "",
        };
    }
  };

  const AlertCard = ({ alert }: { alert: any }) => {
    const config = getSeverityConfig(alert.severity);
    const dt = formatDateTime(alert.timestamp);

    return (
      <Card
        className={`border-0 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${config.cardBorder} ${config.cardBg} ${
          alert.severity === "critical" && !alert.read ? "ring-1 ring-rose-300" : ""
        }`}
      >
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div
              className={`${config.iconBg} p-2.5 rounded-xl h-fit ${
                alert.severity === "critical" && !alert.read ? config.pulseEffect : ""
              }`}
            >
              {config.icon}
            </div>

            <div className="flex-1 space-y-3 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base text-slate-900 truncate">{alert.title}</h3>
                    {!alert.read && (
                      <Badge className="bg-blue-600 text-white shadow-sm text-[11px] px-2 py-0.5">
                        <Bell className="h-3 w-3 mr-1" />
                        Nueva
                      </Badge>
                    )}
                  </div>
                  <p className="text-slate-700 text-sm leading-snug mt-1">{alert.message}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className={`${config.badge} font-bold text-xs px-3 py-1 shadow-sm whitespace-nowrap`}>
                    {config.label}
                  </Badge>

                  {/* ✅ borrar por ID: SOLO admin */}
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-9 w-9 text-rose-600"
                    title={isAdmin ? "Eliminar alerta" : "Solo admin puede eliminar"}
                    disabled={!isAdmin}
                    onClick={async () => {
                      if (!isAdmin) return;
                      try {
                        await deleteAlert(alert._id);
                        // NO necesitas refresh: deleteAlert ya actualiza estado (optimistic)
                      } catch (e) {
                        // si falla, refrescamos para volver a estado real
                        await refresh();
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200">
                  <p className="text-[10px] text-slate-600 font-bold mb-1 uppercase">Detección</p>
                  <div className="flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5 text-blue-600" />
                    <p className="font-bold text-slate-900 text-xs truncate">{alert.weapon_type ?? "-"}</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200">
                  <p className="text-[10px] text-slate-600 font-bold mb-1 uppercase">Cámara</p>
                  <div className="flex items-center gap-2">
                    <Camera className="h-3.5 w-3.5 text-blue-600" />
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] font-bold text-slate-900">{alert.camera_id ?? "-"}</p>
                      <p className="text-[11px] text-slate-600 truncate">—</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200">
                  <p className="text-[10px] text-slate-600 font-bold mb-1 uppercase">Confianza</p>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                    <div className="flex items-center gap-2">
                      <div className="w-14 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full ${
                            (alert.confidence ?? 0) >= 0.9
                              ? "bg-emerald-500"
                              : (alert.confidence ?? 0) >= 0.7
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          }`}
                          style={{
                            width: `${Math.max(0, Math.min(1, alert.confidence ?? 0)) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="font-bold text-slate-900 text-xs">
                        {alert.confidence != null ? `${(alert.confidence * 100).toFixed(0)}%` : "-"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200">
                  <p className="text-[10px] text-slate-600 font-bold mb-1 uppercase">Fecha y Hora</p>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-blue-600" />
                    <div>
                      <p className="font-mono text-[11px] font-bold text-slate-900">{dt.time}</p>
                      <p className="font-mono text-[11px] text-slate-600">{dt.date}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ✅ marcar leída: admin/operator */}
              {!alert.read && (
                <div className="pt-1">
                  <Button
                    size="sm"
                    onClick={() => markAsRead(alert._id)}
                    className="h-9 text-xs bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-sm"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Marcar como leída
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Centro de Alertas</h1>
          <p className="text-slate-600 text-sm mt-1">Notificaciones en tiempo real del sistema de detección</p>
          <p className="text-xs text-slate-500 mt-1">
            Rol: <span className="font-semibold">{user?.role ?? "—"}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-10" onClick={() => refresh()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refrescar
          </Button>

          {/* ❌ Ya NO existe borrar todo por requisito */}

          {unreadCount > 0 && (
            <Button
              onClick={() => markAllAsRead()}
              variant="outline"
              size="sm"
              className="h-10 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Marcar todas
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="py-4 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-600">Total Alertas</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{alerts.length}</p>
              </div>
              <div className="bg-blue-100 p-2.5 rounded-xl">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm border-l-4 border-l-rose-500">
          <CardContent className="py-4 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-600">No Leídas</p>
                <p className="text-2xl font-bold text-rose-600 mt-1">{unreadCount}</p>
              </div>
              <div className="bg-rose-100 p-2.5 rounded-xl">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm border-l-4 border-l-orange-500">
          <CardContent className="py-4 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-600">Críticas</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{criticalCount}</p>
              </div>
              <div className="bg-orange-100 p-2.5 rounded-xl">
                <Shield className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm border-l-4 border-l-emerald-500">
          <CardContent className="py-4 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-600">Procesadas</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{readCount}</p>
              </div>
              <div className="bg-emerald-100 p-2.5 rounded-xl">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 h-11">
          <TabsTrigger value="all" className="text-sm font-bold">
            Todas ({alerts.length})
          </TabsTrigger>
          <TabsTrigger value="unread" className="text-sm font-bold">
            No leídas ({unreadCount})
          </TabsTrigger>
          <TabsTrigger value="read" className="text-sm font-bold">
            Leídas ({readCount})
          </TabsTrigger>
        </TabsList>

        {(["all", "unread", "read"] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-5 space-y-4">
            {pageData.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-14 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="bg-slate-100 p-4 rounded-full">
                      {tab === "unread" ? (
                        <CheckCircle className="h-10 w-10 text-emerald-600" />
                      ) : (
                        <Bell className="h-10 w-10 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 mb-1">{tab === "unread" ? "¡Todo al día!" : "No hay alertas"}</p>
                      <p className="text-sm text-slate-600">{tab === "unread" ? "No tienes alertas sin leer" : "El sistema no ha registrado alertas"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {pageData.map((a: any) => (
                  <AlertCard key={a._id} alert={a} />
                ))}

                <div className="flex items-center justify-between border-t pt-4">
                  <p className="text-xs text-slate-600">
                    Mostrando{" "}
                    <span className="font-bold text-slate-900">{(page - 1) * pageSize + 1}</span>
                    {" - "}
                    <span className="font-bold text-slate-900">{Math.min(page * pageSize, filteredAlerts.length)}</span>{" "}
                    de <span className="font-bold text-slate-900">{filteredAlerts.length}</span>
                  </p>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-9 text-xs" onClick={goPrev} disabled={!canPrev}>
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>

                    <div className="text-xs font-bold px-2">
                      {page} / {totalPages}
                    </div>

                    <Button variant="outline" size="sm" className="h-9 text-xs" onClick={goNext} disabled={!canNext}>
                      Siguiente
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}