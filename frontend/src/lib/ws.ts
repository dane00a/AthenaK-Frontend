const WS_BASE = import.meta.env.VITE_WS_BASE_URL ?? "ws://localhost:8000";

export type LogMessage =
  | { type: "line"; stream: "stdout" | "stderr"; text: string }
  | { type: "status"; status: "queued" | "running" | "success" | "failed" | "cancelled" };

export type LogStream = {
  close: () => void;
};

export function openLogStream(
  kind: "builds" | "runs",
  id: number,
  onMessage: (msg: LogMessage) => void,
): LogStream {
  const socket = new WebSocket(`${WS_BASE}/ws/${kind}/${id}`);
  socket.onmessage = (ev) => {
    try {
      onMessage(JSON.parse(ev.data) as LogMessage);
    } catch {
      /* ignore malformed frames */
    }
  };
  return { close: () => socket.close() };
}
