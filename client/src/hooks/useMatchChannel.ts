import { useEffect, useMemo, useRef, useState } from "react";
import { CommandMessage, MatchSnapshot, ServerEvent } from "@tabellone/shared";

interface UseMatchChannelResult {
  snapshot?: MatchSnapshot;
  status: "connecting" | "open" | "closed";
  error?: string;
  send: (command: CommandMessage) => void;
}

export function useMatchChannel(url: string): UseMatchChannelResult {
  const socketRef = useRef<WebSocket>();
  const [snapshot, setSnapshot] = useState<MatchSnapshot>();
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<"connecting" | "open" | "closed">("connecting");

  useEffect(() => {
    const ws = new WebSocket(url);
    socketRef.current = ws;
    setStatus("connecting");

    ws.onopen = () => setStatus("open");

    ws.onmessage = (event) => {
      const message: ServerEvent = JSON.parse(event.data.toString());
      if (message.type === "snapshot") {
        setSnapshot(message.payload);
        setError(undefined);
      } else if (message.type === "error") {
        setError(message.payload.message);
      }
    };

    ws.onerror = () => {
      setError("Connessione WebSocket fallita");
      setStatus("closed");
    };
    ws.onclose = () => {
      setStatus("closed");
    };

    return () => {
      ws.close();
    };
  }, [url]);

  const send = useMemo(
    () => (command: CommandMessage) => {
      const ws = socketRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(command));
      }
    },
    []
  );

  return { snapshot, status, error, send };
}
