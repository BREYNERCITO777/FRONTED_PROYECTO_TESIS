const API_BASE =
  (import.meta as any).env?.VITE_API_URL ||
  (import.meta as any).env?.REACT_APP_API_BASE ||
  "https://backend-proyecto-tesis-1nv4.onrender.com/api/v1";

const WS_BASE = API_BASE
  .replace(/^https:/, "wss:")
  .replace(/^http:/, "ws:")
  .replace(/\/api\/v1\/?$/, "/api/v1");

export function connectAlertWebSocket(
  onAlert: (alert: any) => void,
  onStatusChange?: (status: "connected" | "disconnected" | "error") => void
): WebSocket {
  const ws = new WebSocket(`${WS_BASE}/ws/alerts`);

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
