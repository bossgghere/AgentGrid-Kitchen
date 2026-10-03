import React, { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
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

    // 2. Add clickable web links addon (for browser OAuth authorization links!)
    const webLinksAddon = new WebLinksAddon((_event, uri) => {
      if (typeof window !== "undefined" && window.agentgrid?.openExternal) {
        window.agentgrid.openExternal(uri);
      } else {
        window.open(uri, "_blank");
      }
    });
    term.loadAddon(webLinksAddon);

    term.open(containerRef.current);

    const fitAndResize = () => {
      try {
        fitAddon.fit();
        const targetRole = activeRole === "master" ? "headchef" : activeRole;
        if (typeof window !== "undefined" && window.agentgrid?.resizeAgent && term.cols && term.rows) {
          window.agentgrid.resizeAgent(targetRole as any, term.cols, term.rows);
        }
      } catch {}
    };

    setTimeout(fitAndResize, 50);

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // 3. Wire user keyboard typing directly into the PTY backend
    const onDataDisposable = term.onData((data) => {
      const targetRole = activeRole === "master" ? "headchef" : activeRole;
      if (typeof window !== "undefined" && window.agentgrid?.writeToAgent) {
        window.agentgrid.writeToAgent(targetRole as any, data);
      }
    });

    // 4. Listen to incoming real-time PTY stream from Electron main process
    let unbindPty: (() => void) | null = null;
    if (typeof window !== "undefined" && window.agentgrid?.onPtyData) {
      unbindPty = window.agentgrid.onPtyData((event) => {
        if (activeRole === "master" || event.role === activeRole) {
          term.write(event.data);
        }
      });
    }

    // 5. Auto-fit on window resize
    window.addEventListener("resize", fitAndResize);

    // Initial greeting banner
    term.writeln("\x1b[1;33m[AGENTGRID KITCHEN] ──► Real Antigravity CLI Terminal\x1b[0m");
    if (currentWorkspacePath) {
      term.writeln(`\x1b[90m• Workspace:\x1b[0m \x1b[34m${currentWorkspacePath}\x1b[0m`);
    } else {
      term.writeln("\x1b[33m• Workspace: Standby (please select workspace folder to begin)\x1b[0m");
    }
    term.writeln("\x1b[90m• Real-time PTY session connected. Keystrokes & OAuth links active.\x1b[0m\r\n");

    // 6. Auto-spawn interactive agy CLI in workspace if not already running
    if (typeof window !== "undefined" && currentWorkspacePath) {
      const targetRole = activeRole === "master" ? "headchef" : activeRole;
      if (window.agentgrid?.getActiveAgents) {
        window.agentgrid.getActiveAgents().then((agents) => {
          const isRunning = agents.some((a) => a.role === targetRole && a.status === "running");
          if (!isRunning) {
            if (targetRole === "headchef" && window.agentgrid?.spawnAgy) {
              window.agentgrid.spawnAgy(currentWorkspacePath, "headchef");
            } else if (window.agentgrid?.spawnAgent) {
              window.agentgrid.spawnAgent({
                role: targetRole as any,
                command: process.env.SHELL || "/bin/zsh",
                args: ["-l"],
                cwd: currentWorkspacePath,
                interactive: true,
              }).catch(() => {});
            }
          }
        });
      }
    }

    return () => {
      window.removeEventListener("resize", fitAndResize);
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
