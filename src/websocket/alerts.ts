import { API_BASE } from "../api/base";

const RUTA_WS = "/ws/alerts";
const PREFIJO_API = "/api/v1";

/**
 * Arma la URL del WebSocket tolerando las dos formas en que suele venir
 * REACT_APP_WS_BASE: el endpoint completo, o solo el host.
 *
 * Antes se usaba la variable tal cual, asi que un valor como
 * "ws://localhost:8000" (sin la ruta) hacia que el servidor respondiera 403 y
 * las alertas en vivo no llegaran nunca.
 */
export function resolverUrlWebSocket(): string {
  const base = (process.env.REACT_APP_WS_BASE || "").trim().replace(/\/+$/, "");

  if (base) {
    // Ya apunta al endpoint completo.
    if (base.includes(RUTA_WS)) return base;
    // Solo trae el host: se completa.
    return base + PREFIJO_API + RUTA_WS;
  }

  // Sin variable propia, se deriva de la URL de la API cambiando el esquema
  // (http -> ws, https -> wss), para no repetir el host en dos sitios.
  return API_BASE.replace(/^http/, "ws") + RUTA_WS;
}

export function connectAlertWebSocket(
  onAlert: (alert: any) => void,
  onStatusChange?: (status: "connected" | "disconnected" | "error") => void
): WebSocket {
  const ws = new WebSocket(resolverUrlWebSocket());

  ws.onopen = () => {
    console.log("WebSocket alerts conectado");
    onStatusChange?.("connected");

    try {
      ws.send("ping");
    } catch {
      // no-op
    }
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);

      if (message.event === "new_alert") {
        onAlert(message.data);
      }
    } catch (error) {
      console.error("Error procesando WebSocket:", error);
    }
  };

  ws.onerror = () => {
    console.error("Error WebSocket alerts");
    onStatusChange?.("error");
  };

  ws.onclose = () => {
    console.log("WebSocket alerts cerrado");
    onStatusChange?.("disconnected");
  };

  return ws;
}

/**
 * Alias para compatibilidad con componentes antiguos.
 * Algunos módulos importan connectAlerts.
 */
export function connectAlerts(
  onAlert: (alert: any) => void,
  onStatusChange?: (status: "connected" | "disconnected" | "error") => void
): WebSocket {
  return connectAlertWebSocket(onAlert, onStatusChange);
}
