import { useEffect, useMemo, useRef, useState } from "react";
import { CommandMessage, EventLogEntry, MatchSnapshot, ServerEvent } from "@tabellone/shared";

interface UseMatchChannelResult {
  snapshot?: MatchSnapshot;
  status: "connecting" | "open" | "closed";
  error?: string;
  eventLog?: EventLogEntry[];
  introVideoKey?: number;
  send: (command: CommandMessage) => void;
}

export function useMatchChannel(url: string): UseMatchChannelResult {
  const socketRef = useRef<WebSocket>();
  const [snapshot, setSnapshot] = useState<MatchSnapshot>();
  const [error, setError] = useState<string>();
  const [eventLog, setEventLog] = useState<EventLogEntry[]>();
  const [introVideoKey, setIntroVideoKey] = useState<number>();
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
      } else if (message.type === "event_log") {
        setEventLog(message.payload.entries);
      } else if (message.type === "intro_video") {
        setIntroVideoKey(Number(message.payload.key));
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

  return { snapshot, status, error, eventLog, introVideoKey, send };
}
