import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import { useEffect, useRef } from "react";

import { openLogStream, type LogMessage } from "../lib/ws";

type Props = {
  kind: "builds" | "runs";
  id: number | null;
  onStatus?: (status: string) => void;
};

export function LogPane({ kind, id, onStatus }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    const term = new Terminal({
      convertEol: true,
      fontSize: 12,
      theme: { background: "#0b1020" },
      scrollback: 10_000,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(hostRef.current);
    fit.fit();
    termRef.current = term;
    fitRef.current = fit;

    const onResize = () => fit.fit();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!termRef.current || id === null) return;
    termRef.current.clear();
    const term = termRef.current;
    const stream = openLogStream(kind, id, (msg: LogMessage) => {
      if (msg.type === "line") {
        term.writeln(msg.text);
      } else if (msg.type === "status") {
        onStatus?.(msg.status);
        term.writeln(`\u001b[36m[status] ${msg.status}\u001b[0m`);
      }
    });
    return () => stream.close();
  }, [kind, id, onStatus]);

  return <div ref={hostRef} className="h-full w-full" />;
}
