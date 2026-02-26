import React, { useEffect, useState } from "react";
import { connectAlerts } from "../websocket/alerts";

export default function Dashboard() {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    const ws = connectAlerts((data) =>
      setAlerts((prev) => [data, ...prev])
    );
    return () => ws.close();
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      {alerts.map((a, i) => (
        <div key={i}>
          {a.weapon_type} - {a.confidence}
        </div>
      ))}
    </div>
  );
}
