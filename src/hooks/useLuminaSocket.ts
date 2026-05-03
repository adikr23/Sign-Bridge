import { useState, useEffect, useRef } from "react";
import { TelemetryData } from "../types/dashboard";

export function useLuminaSocket() {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const socket = new WebSocket(`${protocol}//${host}/api/ws`);

    socket.onopen = () => {
      setConnected(true);
      console.log("WebSocket Connected");
    };

    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === "TELEMETRY") {
        setTelemetry(payload.data);
      }
    };

    socket.onclose = () => {
      setConnected(false);
      console.log("WebSocket Disconnected");
    };

    socketRef.current = socket;

    return () => {
      socket.close();
    };
  }, []);

  const sendMessage = (message: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    }
  };

  return { telemetry, connected, sendMessage };
}
