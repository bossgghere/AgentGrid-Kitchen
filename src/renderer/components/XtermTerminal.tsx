import React, { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "@xterm/addon-fit";
import type { PassTab } from "../store/kitchenStore.ts";

interface XtermTerminalProps {
  activeRole: PassTab;
  currentWorkspacePath?: string;
  fontSize?: number;
}

export const XtermTerminal: React.FC<XtermTerminalProps> = ({
  activeRole,
  currentWorkspacePath,
  fontSize = 12,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Initialize high-performance xterm.js instance with exact Munder Difflin cream palette
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: "block",
      fontSize: fontSize,
      lineHeight: 1.25,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: "#fffdfa",
        foreground: "#18181b",
        cursor: "#f59e0b",
        selectionBackground: "rgba(245, 158, 11, 0.35)",
        black: "#18181b",
        red: "#dc2626",
        green: "#16a34a",
        yellow: "#d97706",
        blue: "#2563eb",
        magenta: "#9333ea",
        cyan: "#0284c7",
        white: "#f8fafc",
        brightBlack: "#475569",
        brightRed: "#ef4444",
        brightGreen: "#22c55e",
        brightYellow: "#eab308",
        brightBlue: "#3b82f6",
        brightMagenta: "#a855f7",
        brightCyan: "#0ea5e9",
        brightWhite: "#ffffff",
      },
      convertEol: true,
      scrollback: 10000,
      allowTransparency: false,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);

    setTimeout(() => {
      try {
        fitAddon.fit();
      } catch {}
    }, 50);

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // 2. Wire user keyboard typing directly into the PTY backend
    const onDataDisposable = term.onData((data) => {
      const targetRole = activeRole === "master" ? "headchef" : activeRole;
      if (typeof window !== "undefined" && window.agentgrid?.writeToAgent) {
        window.agentgrid.writeToAgent(targetRole as any, data);
      }
    });

    // 3. Listen to incoming real-time PTY stream from Electron main process
    let unbindPty: (() => void) | null = null;
    if (typeof window !== "undefined" && window.agentgrid?.onPtyData) {
      unbindPty = window.agentgrid.onPtyData((event) => {
        if (activeRole === "master" || event.role === activeRole) {
          term.write(event.data);
        }
      });
    }

    // 4. Auto-fit on window resize
    const handleResize = () => {
      try {
        fitAddon.fit();
      } catch {}
    };
    window.addEventListener("resize", handleResize);

    // Initial greeting line matching Munder Difflin
    term.writeln("\x1b[1m> Let's ask each of the agents what are they up to. In short,\x1b[0m");
    term.writeln("\x1b[90m• On it — sending each of the agents a status query.\x1b[0m");
    term.writeln("\x1b[32mRan 1 shell command\x1b[0m");
    if (currentWorkspacePath) {
      term.writeln(`\x1b[90m• Target Workspace:\x1b[0m \x1b[34m${currentWorkspacePath}\x1b[0m`);
    } else {
      term.writeln("\x1b[33m• Workspace: Standby (select folder below)\x1b[0m");
    }
    term.writeln("\x1b[90m* Ready for guest orders in QUEUE\x1b[0m\r\n");

    // 5. Auto-spawn interactive shell in workspace if not already running
    if (typeof window !== "undefined" && window.agentgrid?.getActiveAgents && currentWorkspacePath) {
      window.agentgrid.getActiveAgents().then((agents) => {
        const isRunning = agents.some((a) => a.role === "headchef" && a.status === "running");
        if (!isRunning && window.agentgrid?.spawnAgent) {
          window.agentgrid.spawnAgent({
            role: "headchef",
            command: "/bin/zsh",
            args: ["-l"],
            cwd: currentWorkspacePath,
            interactive: true,
          }).catch(() => {});
        }
      });
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      onDataDisposable.dispose();
      if (unbindPty) unbindPty();
      term.dispose();
      termRef.current = null;
    };
  }, [activeRole, currentWorkspacePath, fontSize]);

  return (
    <div
      ref={containerRef}
      className="flex-1 w-full h-full bg-[#fffdfa] p-2 overflow-hidden select-text cursor-text"
      onClick={() => termRef.current?.focus()}
    />
  );
};
