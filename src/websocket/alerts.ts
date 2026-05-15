const WS_URL =
  process.env.REACT_APP_WS_BASE ||
  "wss://backend-proyecto-tesis-1nv4.onrender.com/api/v1/ws/alerts";

export function connectAlertWebSocket(
  onAlert: (alert: any) => void,
  onStatusChange?: (status: "connected" | "disconnected" | "error") => void
): WebSocket {
  const ws = new WebSocket(WS_URL);

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
