import React, { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "@xterm/addon-fit";
import type { PassTab } from "../store/kitchenStore.ts";

interface XtermTerminalProps {
  activeRole: PassTab;
  currentWorkspacePath?: string;
}

export const XtermTerminal: React.FC<XtermTerminalProps> = ({
  activeRole,
  currentWorkspacePath,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Initialize high-performance xterm.js instance
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: "block",
      fontSize: 12,
      lineHeight: 1.25,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: "#0b1019",
        foreground: "#34d399",
        cursor: "#f59e0b",
        selectionBackground: "rgba(245, 158, 11, 0.35)",
        black: "#0b1019",
        red: "#f87171",
        green: "#4ade80",
        yellow: "#fbbf24",
        blue: "#60a5fa",
        magenta: "#c084fc",
        cyan: "#38bdf8",
        white: "#f1f5f9",
        brightBlack: "#475569",
        brightRed: "#fca5a5",
        brightGreen: "#86efac",
        brightYellow: "#fde047",
        brightBlue: "#93c5fd",
        brightMagenta: "#d8b4fe",
        brightCyan: "#7dd3fc",
        brightWhite: "#ffffff",
      },
      convertEol: true,
      scrollback: 10000,
      allowTransparency: false,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);

    // Initial fit
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

    // Initial terminal greeting banner
    term.writeln("\x1b[38;2;245;158;11m╔═══════════════════════════════════════════════════════════════════════════════╗\x1b[0m");
    term.writeln("\x1b[38;2;245;158;11m║              AGENTGRID KITCHEN — REAL PTY INTERACTIVE TERMINAL                ║\x1b[0m");
    term.writeln("\x1b[38;2;245;158;11m║        Connected to agy CLI • Direct Keystroke Piping • ANSI Color Mode       ║\x1b[0m");
    term.writeln("\x1b[38;2;245;158;11m╚═══════════════════════════════════════════════════════════════════════════════╝\x1b[0m\r\n");
    if (currentWorkspacePath) {
      term.writeln(`\x1b[90m📁 Workspace:\x1b[0m \x1b[38;2;56;189;248m${currentWorkspacePath}\x1b[0m`);
    } else {
      term.writeln("\x1b[33m⚠️ No folder selected yet. Choose folder below before instructing Head Chef.\x1b[0m");
    }
    term.writeln("\x1b[90m💡 Type prompts into the QUEUE box below or interact directly with the PTY.\x1b[0m\r\n");

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
  }, [activeRole, currentWorkspacePath]);

  return (
    <div
      ref={containerRef}
      className="flex-1 w-full h-full bg-[#0b1019] p-2 overflow-hidden select-text"
      onClick={() => termRef.current?.focus()}
    />
  );
};
