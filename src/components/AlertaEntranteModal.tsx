import React, { useEffect } from "react";
import { AlertTriangle, Camera, Clock, Gauge, ImageOff, X } from "lucide-react";

import { AlertUI } from "../api/alerts";

type Props = {
  alerta: AlertUI | null;
  onCerrar: () => void;
  onMarcarLeida: (id: string) => void;
};

const NOMBRES: Record<string, string> = {
  arma_fuego: "Arma de fuego",
  arma_blanca: "Arma blanca",
};

function nombreLegible(tipo?: string | null) {
  if (!tipo) return "Detección";
  return NOMBRES[tipo] ?? tipo.replace(/_/g, " ");
}

function hora(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isFinite(d.getTime())
    ? d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";
}

/**
 * Aviso a pantalla completa de una detección recién llegada.
 *
 * En un sistema de detección de armas no basta con añadir una fila a una lista:
 * el operador puede estar en otro módulo o mirando otra cosa. Este modal
 * interrumpe, muestra la evidencia y exige una acción explícita.
 */
export function AlertaEntranteModal({ alerta, onCerrar, onMarcarLeida }: Props) {
  // Escape cierra, como en cualquier diálogo.
  useEffect(() => {
    if (!alerta) return;
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [alerta, onCerrar]);

  if (!alerta) return null;

  const critica = (alerta.confidence ?? 0) >= 0.9 || alerta.severity === "critical";

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="alerta-titulo"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 fondo-modal"
      onClick={onCerrar}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "alertaEntra .28s cubic-bezier(.16,1,.3,1) both" }}
      >
        <style>{`
          @keyframes alertaEntra {
            from { opacity: 0; transform: translateY(16px) scale(.97); }
            to   { opacity: 1; transform: none; }
          }
          @keyframes alertaPulso {
            0%, 100% { opacity: 1; }
            50%      { opacity: .45; }
          }
          @media (prefers-reduced-motion: reduce) {
            [data-pulso] { animation: none !important; }
          }
        `}</style>

        {/* Franja superior: el color comunica la gravedad antes que el texto. */}
        <div className={critica ? "h-1.5 bg-rose-600" : "h-1.5 bg-amber-500"} />

        <button
          onClick={onCerrar}
          aria-label="Cerrar aviso"
          className="absolute right-3 top-4 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={18} />
        </button>

        <div className="px-6 pb-6 pt-5">
          <div className="flex items-start gap-3">
            <div
              className={`shrink-0 rounded-xl p-2.5 ${
                critica ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
              }`}
            >
              <AlertTriangle size={22} />
            </div>

            <div className="min-w-0 pr-6">
              <div className="mb-1 flex items-center gap-2">
                <span
                  data-pulso
                  className={`inline-block h-2 w-2 rounded-full ${
                    critica ? "bg-rose-500" : "bg-amber-500"
                  }`}
                  style={{ animation: "alertaPulso 1.2s ease-in-out infinite" }}
                />
                <span
                  className={`font-mono text-[10px] uppercase tracking-widest ${
                    critica ? "text-rose-600" : "text-amber-600"
                  }`}
                >
                  {critica ? "Detección crítica" : "Detección detectada"}
                </span>
              </div>

              <h2 id="alerta-titulo" className="text-xl font-bold leading-tight text-slate-900">
                {nombreLegible(alerta.weapon_type ?? alerta.type)}
              </h2>
              <p className="mt-0.5 text-sm text-slate-600">
                {alerta.camera_name || "Cámara no identificada"}
              </p>
            </div>
          </div>

          {/* Evidencia: es lo que permite al operador decidir en un vistazo. */}
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
            {alerta.evidenceImage ? (
              <img
                src={alerta.evidenceImage}
                alt={`Captura de la detección en ${alerta.camera_name ?? "la cámara"}`}
                className="max-h-64 w-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 bg-slate-50 px-6 py-10 text-center">
                <ImageOff className="h-6 w-6 text-slate-400" />
                <p className="text-xs text-slate-500">Esta detección llegó sin captura</p>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <Dato icono={<Gauge size={13} />} etiqueta="Confianza">
              {alerta.confidence != null ? `${Math.round(alerta.confidence * 100)}%` : "—"}
            </Dato>
            <Dato icono={<Camera size={13} />} etiqueta="Cámara">
              {alerta.camera_name || "—"}
            </Dato>
            <Dato icono={<Clock size={13} />} etiqueta="Hora">
              {hora(alerta.timestamp ?? alerta.created_at)}
            </Dato>
          </div>

          <div className="mt-5 flex gap-2">
            <button
              onClick={() => {
                onMarcarLeida(alerta._id);
                onCerrar();
              }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold text-white shadow-sm transition ${
                critica ? "bg-rose-600 hover:bg-rose-700" : "bg-amber-600 hover:bg-amber-700"
              }`}
            >
              Atendida
            </button>
            <button
              onClick={onCerrar}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Revisar después
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Dato({
  icono,
  etiqueta,
  children,
}: {
  icono: React.ReactNode;
  etiqueta: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-slate-400">
        {icono} {etiqueta}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">{children}</p>
    </div>
  );
}
