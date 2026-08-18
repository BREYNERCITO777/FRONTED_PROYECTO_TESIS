import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "../../../shared/ui/card";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../../shared/ui/tabs";

import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Camera,
  Shield,
  Bell,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

import { useAlerts } from "../../../app/providers/alerts-context";
import { useAuth } from "../../../context/auth-context";
import { AlertaEntranteModal } from "../../../components/AlertaEntranteModal";

type Tab = "all" | "unread" | "read";

const NOMBRES_ARMA: Record<string, string> = {
  arma_fuego: "Arma de fuego",
  arma_blanca: "Arma blanca",
};

/** Convierte arma_fuego en "Arma de fuego": el operador no lee identificadores. */
function nombreArma(tipo?: string | null) {
  if (!tipo) return "Detección";
  return NOMBRES_ARMA[tipo] ?? tipo.replace(/_/g, " ");
}

export function Alerts() {
  const { user } = useAuth();

  const {
    alerts,
    unreadCount,
    refresh,
    markAsRead,
    markAllAsRead,
  } = useAlerts();

  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [detalle, setDetalle] = useState<any | null>(null);

  // Con filas compactas caben muchas más por pantalla que con las tarjetas
  // anteriores, que mostraban la evidencia a tamaño completo.
  const pageSize = 10;
  const [page, setPage] = useState(1);

  const readCount = useMemo(
    () => alerts.filter((a) => a.read).length,
    [alerts]
  );

  const criticalCount = useMemo(
    () => alerts.filter((a) => a.severity === "critical").length,
    [alerts]
  );

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

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

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

  const getSeverityConfig = (severity?: string | null) => {
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

  /**
   * Fila compacta.
   *
   * Antes cada alerta era una tarjeta con la evidencia a tamaño completo: una
   * sola ocupaba toda la pantalla y había que desplazarse para ver la
   * siguiente. En un centro de alertas lo que importa es abarcar muchas de un
   * vistazo; la imagen grande vive ahora en el detalle.
   */
  const AlertCard = ({ alert }: { alert: any }) => {
    const config = getSeverityConfig(alert.severity);
    const dt = formatDateTime(alert.timestamp || alert.created_at);
    const conf = Math.max(0, Math.min(1, alert.confidence ?? 0));

    return (
      <Card
        onClick={() => setDetalle(alert)}
        className={`cursor-pointer border-0 shadow-sm transition-all duration-200 hover:shadow-md overflow-hidden ${config.cardBorder} ${
          !alert.read ? "bg-white" : "bg-slate-50/60"
        }`}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            {/* Miniatura: permite descartar un falso positivo sin abrir nada. */}
            <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-900">
              {alert.evidenceImage ? (
                <img
                  src={alert.evidenceImage}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Camera className="h-4 w-4 text-slate-500" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {!alert.read && (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" title="Sin leer" />
                )}
                <h3 className="truncate text-sm font-bold text-slate-900">
                  {nombreArma(alert.weapon_type ?? alert.type)}
                </h3>
                <Badge className={`${config.badge} shrink-0 px-2 py-0 text-[10px] font-bold`}>
                  {config.label}
                </Badge>
              </div>

              <p className="mt-0.5 flex items-center gap-3 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1 truncate">
                  <Camera className="h-3 w-3 shrink-0" />
                  {alert.camera_name ?? "Cámara no identificada"}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 font-mono">
                  <Clock className="h-3 w-3" />
                  {dt.time}
                </span>
              </p>
            </div>

            {/* Confianza: barra + número, alineados para poder compararlos
                de un vistazo entre filas. */}
            <div className="hidden w-28 shrink-0 items-center gap-2 sm:flex">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full ${
                    conf >= 0.9 ? "bg-rose-500" : conf >= 0.7 ? "bg-amber-500" : "bg-slate-400"
                  }`}
                  style={{ width: `${conf * 100}%` }}
                />
              </div>
              <span className="w-9 text-right font-mono text-xs font-bold tabular-nums text-slate-900">
                {alert.confidence != null ? `${(conf * 100).toFixed(0)}%` : "—"}
              </span>
            </div>

            {!alert.read && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  markAsRead(alert._id);
                }}
                className="hidden shrink-0 border-slate-300 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 md:inline-flex"
                title="Marcar como leída"
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Centro de Alertas
          </h1>

          <p className="text-slate-600 text-sm mt-1">
            Notificaciones en tiempo real del sistema de detección
          </p>

          <p className="text-xs text-slate-500 mt-1">
            Rol:{" "}
            <span className="font-semibold">
              {user?.role ?? "—"}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-10"
            onClick={() => refresh()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refrescar
          </Button>

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
                <p className="text-xs font-semibold text-slate-600">
                  Total Alertas
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {alerts.length}
                </p>
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
                <p className="text-xs font-semibold text-slate-600">
                  No Leídas
                </p>
                <p className="text-2xl font-bold text-rose-600 mt-1">
                  {unreadCount}
                </p>
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
                <p className="text-xs font-semibold text-slate-600">
                  Críticas
                </p>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  {criticalCount}
                </p>
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
                <p className="text-xs font-semibold text-slate-600">
                  Procesadas
                </p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  {readCount}
                </p>
              </div>

              <div className="bg-emerald-100 p-2.5 rounded-xl">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as Tab)}
        className="w-full"
      >
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
                      <p className="font-semibold text-slate-900 mb-1">
                        {tab === "unread"
                          ? "¡Todo al día!"
                          : "No hay alertas"}
                      </p>

                      <p className="text-sm text-slate-600">
                        {tab === "unread"
                          ? "No tienes alertas sin leer"
                          : "El sistema no ha registrado alertas"}
                      </p>
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
                    <span className="font-bold text-slate-900">
                      {(page - 1) * pageSize + 1}
                    </span>
                    {" - "}
                    <span className="font-bold text-slate-900">
                      {Math.min(page * pageSize, filteredAlerts.length)}
                    </span>{" "}
                    de{" "}
                    <span className="font-bold text-slate-900">
                      {filteredAlerts.length}
                    </span>
                  </p>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 text-xs"
                      onClick={goPrev}
                      disabled={!canPrev}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>

                    <div className="text-xs font-bold px-2">
                      {page} / {totalPages}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 text-xs"
                      onClick={goNext}
                      disabled={!canNext}
                    >
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

      {/* Se reutiliza el mismo aviso que aparece al llegar una detección, para
          que el operador vea siempre la misma ficha. */}
      <AlertaEntranteModal
        alerta={detalle}
        onCerrar={() => setDetalle(null)}
        onMarcarLeida={(id) => markAsRead(id)}
      />
    </div>
  );
}
