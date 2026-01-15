import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { CommandMessage, ServerEvent } from "@tabellone/shared";
import { MatchService } from "../application/matchService";
import { CommandFailed } from "../application/errors";

export interface WebsocketServerConfig {
  port?: number;
  snapshotIntervalMs?: number;
}

export function startWebsocketServer(config: WebsocketServerConfig = {}) {
  const port = config.port ?? 4000;
  const snapshotIntervalMs = config.snapshotIntervalMs ?? 200;
  const server = http.createServer();
  const wss = new WebSocketServer({ server });
  const matchService = new MatchService();

  const broadcast = (event: ServerEvent) => {
    const data = JSON.stringify(event);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  };

  const send = (ws: WebSocket, event: ServerEvent) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
  };

  wss.on("connection", (ws) => {
    // Log semplice per diagnosi connessioni
    console.log(`[ws] client connesso (${wss.clients.size} totali)`);
    send(ws, { type: "snapshot", payload: matchService.snapshot() });

    ws.on("message", (raw) => {
      try {
        const parsed: CommandMessage = JSON.parse(raw.toString());
        console.log("[ws] comando", parsed.type);
        matchService.dispatch(parsed);
        broadcast({ type: "snapshot", payload: matchService.snapshot() });
        send(ws, { type: "ack", payload: { ok: true } });
      } catch (err) {
        const message = err instanceof CommandFailed ? err.message : "Errore imprevisto";
        send(ws, { type: "error", payload: { message } });
      }
    });

    ws.on("close", () => {
      console.log(`[ws] client disconnesso (${wss.clients.size} restanti)`);
    });
  });

  const timer = setInterval(() => {
    broadcast({ type: "snapshot", payload: matchService.snapshot() });
  }, snapshotIntervalMs);

  server.listen(port, () => {
    /* eslint-disable no-console */
    console.log(`WebSocket server in ascolto sulla porta ${port}`);
  });

  const stop = () => {
    clearInterval(timer);
    wss.close();
    server.close();
  };

  return { server, wss, stop };
}
