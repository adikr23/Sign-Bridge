import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import path from "path";

async function startServer() {
  const app = express();
  const server = createServer(app);
  const PORT = 3000;

  // WebSocket Server
  const wss = new WebSocketServer({ server, path: "/api/ws" });

  // Mock Sensor Data Generator
  let simulationMode = "STANDBY";
  let activeContext = "General";

  const getMockData = () => {
    // Base ranges
    let flex = [20, 15, 10, 12, 18]; // Mostly open
    let accel = { x: "0.01", y: "0.02", z: "9.81" };

    if (simulationMode === "HEADING_HELLO") {
      flex = [85, 90, 88, 82, 85]; // Clenched
      accel.x = (Math.random() * 0.2 - 0.1).toFixed(2);
    } else if (simulationMode === "HEADING_AFRAID") {
      flex = [15, 12, 10, 10, 12]; // Open
      accel.x = (Math.random() * 2 - 1).toFixed(2); // Shaking
    } else if (simulationMode === "HEADING_HELP") {
      flex = [90, 20, 20, 20, 20]; // Pointing
      accel.y = (Math.random() * 1.5).toFixed(2);
    }

    return {
      flex: flex.map(f => Math.min(100, Math.max(0, f + (Math.random() * 10 - 5)))),
      accel: {
        x: (parseFloat(accel.x) + (Math.random() * 0.1 - 0.05)).toFixed(2),
        y: (parseFloat(accel.y) + (Math.random() * 0.1 - 0.05)).toFixed(2),
        z: (parseFloat(accel.z) + (Math.random() * 0.1 - 0.05)).toFixed(2),
      },
      timestamp: Date.now()
    };
  };

  wss.on("connection", (ws) => {
    console.log("Client connected to WebSocket");
    
    const interval = setInterval(() => {
      ws.send(JSON.stringify({ 
        type: "TELEMETRY", 
        data: getMockData(),
        status: simulationMode 
      }));
    }, 100);

    ws.on("message", (message) => {
      try {
        const payload = JSON.parse(message.toString());
        if (payload.type === "SET_SIMULATION") {
          simulationMode = payload.mode;
        }
        if (payload.type === "SET_CONTEXT") {
          activeContext = payload.context;
        }
      } catch (e) {
        console.error("Error parsing WS message:", e);
      }
    });

    ws.on("close", () => {
      clearInterval(interval);
      console.log("Client disconnected");
    });
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
