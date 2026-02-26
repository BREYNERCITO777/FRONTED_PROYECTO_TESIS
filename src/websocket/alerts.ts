export function connectAlerts(onMessage: (data: any) => void) {
  const base = process.env.REACT_APP_WS_BASE || "ws://localhost:8000";
  const ws = new WebSocket(`${base}/ws/alerts`);

  ws.onmessage = (event) => onMessage(JSON.parse(event.data));
  ws.onerror = () => console.error("WebSocket error");
  return ws;
}
