import React, { useState, useRef, useEffect } from "react";
import { useKitchenStore, type PassTab } from "../store/kitchenStore.ts";
import { XtermTerminal } from "./XtermTerminal.tsx";
import type { ChefRole } from "../../domain/types/hive.types.ts";

export const CommandCenter: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    activeAgents,
    activeBrigadeChefs,
    projects,
    activeProjectId,
    chooseDirectoryForProject,
    chatMessages,
    sendChatMessage,
    tickets,
    messages,
  } = useKitchenStore();

  const [commandTab, setCommandTab] = useState<
    "terminal" | "monitor" | "tasks" | "askme" | "triggers" | "memory" | "graph" | "activity" | "commands" | "workers"
  >("terminal");
  const [inputMessage, setInputMessage] = useState("");
  const [fontSize, setFontSize] = useState<number>(12);

  // Memory ledger states
  const [memoryFiles, setMemoryFiles] = useState<{ name: string; content: string }[]>([]);
  const [selectedFileName, setSelectedFileName] = useState<string>("recipe_plan.md");
  const [selectedFileContent, setSelectedFileContent] = useState<string>("");
  const [isLoadingMemory, setIsLoadingMemory] = useState<boolean>(false);

  const currentProject = projects.find((p) => p.id === activeProjectId) || projects[0];
  const isHeadChefWorking = activeAgents.some((a) => a.role === "headchef" && a.status === "running");

  const loadMemoryLedger = async () => {
    setIsLoadingMemory(true);
    const filesToTry = ["recipe_plan.md", "index.html", "styles.css", "script.js", "tickets.json", "package.json"];
    const loaded: { name: string; content: string }[] = [];

    if (typeof window !== "undefined" && window.agentgrid?.readFile) {
      for (const fname of filesToTry) {
        try {
          const content = await window.agentgrid.readFile(fname);
          if (content !== null && content !== undefined) {
            loaded.push({ name: fname, content });
          }
        } catch {}
      }
    }

    setMemoryFiles(loaded);
    if (loaded.length > 0) {
      const match = loaded.find((f) => f.name === selectedFileName) || loaded[0];
      setSelectedFileName(match.name);
      setSelectedFileContent(match.content);
    } else {
      setSelectedFileContent("# No files found in ledger yet.\n\nInstruct the Head Chef via QUEUE to start cooking your files!");
    }
    setIsLoadingMemory(false);
  };

  useEffect(() => {
    if (commandTab === "memory") {
      loadMemoryLedger();
    }
  }, [commandTab, activeProjectId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    if (!currentProject?.path || currentProject.path.trim() === "") {
      const chosen = await chooseDirectoryForProject(currentProject?.id || "proj-default");
      if (!chosen) {
        return; // User cancelled folder selection
      }
    }

    const msg = inputMessage.trim();
    setInputMessage("");
    setCommandTab("terminal"); // Auto-switch to terminal to watch execution live!

    // Direct forwarding to real interactive agy session in the terminal
    if (typeof window !== "undefined" && window.agentgrid) {
      if (window.agentgrid.getActiveAgents) {
        const agents = await window.agentgrid.getActiveAgents();
        const isRunning = agents.some((a) => a.role === "headchef" && a.status === "running");
        if (!isRunning && window.agentgrid.spawnAgy) {
          await window.agentgrid.spawnAgy(currentProject?.path, "headchef");
          setTimeout(() => {
            window.agentgrid?.writeToAgent("headchef", `${msg}\r`);
          }, 800);
        } else {
          await window.agentgrid.writeToAgent("headchef", `${msg}\r`);
        }
      } else if (window.agentgrid.writeToAgent) {
        await window.agentgrid.writeToAgent("headchef", `${msg}\r`);
      }
    }

    // Also update UI store (chat history and task ticket) so tasks tab and floor state stay in sync!
    await sendChatMessage(msg);
  };

  const handleChooseFolder = async () => {
    if (currentProject) {
      await chooseDirectoryForProject(currentProject.id);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#fbf9f4] border-2 border-[#2d241d] rounded-sm overflow-hidden shadow-md">
      {/* 1. Command Center Top Header (Exact Munder Difflin Style) */}
      <div className="p-2.5 bg-[#fbf9f4] border-b-2 border-[#2d241d] flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            {/* Avatar thumbnail */}
            <div className="w-8 h-8 rounded-sm bg-[#f7ecd0] border border-[#2d241d] flex items-center justify-center text-lg shadow-xs">
              👨‍💼
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black tracking-wider text-[#2d241d] uppercase font-mono">COMMAND CENTER</span>
              </div>
              <div className="flex items-center space-x-1.5 text-[10px] text-[#5c4a39] font-mono">
                <span className={`w-2 h-2 inline-block ${isHeadChefWorking ? "bg-[#eab308] animate-pulse" : "bg-[#d97706]"}`}></span>
                <span className="font-bold">{isHeadChefWorking ? "working" : "idle"}</span>
                <span>Michael runs the floor</span>
              </div>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center space-x-1.5 text-[10px] font-mono">
            <button className="px-2 py-0.5 bg-[#fffdfa] border border-[#2d241d] rounded-sm font-bold shadow-xs hover:bg-[#ebdcc0] flex items-center space-x-1">
              <span>▶</span>
              <span>auto</span>
            </button>
            <button className="px-2 py-0.5 bg-[#fffdfa] border border-[#2d241d] rounded-sm font-bold shadow-xs hover:bg-[#ebdcc0]">
              &lt;/&gt; IDE
            </button>
          </div>
        </div>

        {/* 2 Rows of Sub-Tabs (Exact Munder Difflin 10-Tab Grid) */}
        <div className="flex flex-col space-y-1 border-t border-[#2d241d]/20 pt-1.5 text-[11px] font-mono">
          {/* Row 1: terminal, monitor, tasks, ask me, triggers */}
          <div className="grid grid-cols-5 gap-1">
            <button
              onClick={() => setCommandTab("terminal")}
              className={`py-0.5 px-1 rounded-sm text-center font-bold transition-all border ${
                commandTab === "terminal"
                  ? "bg-[#eab308] text-[#18181b] border-[#2d241d] shadow-xs"
                  : "bg-[#fffdfa] text-[#4a3b2c] border-[#2d241d] hover:bg-[#ebdcc0]"
              }`}
            >
              &gt;_ terminal
            </button>
            <button
              onClick={() => setCommandTab("monitor")}
              className={`py-0.5 px-1 rounded-sm text-center font-bold transition-all border ${
                commandTab === "monitor"
                  ? "bg-[#eab308] text-[#18181b] border-[#2d241d] shadow-xs"
                  : "bg-[#fffdfa] text-[#4a3b2c] border-[#2d241d] hover:bg-[#ebdcc0]"
              }`}
            >
              ^ monitor
            </button>
            <button
              onClick={() => setCommandTab("tasks")}
              className={`py-0.5 px-1 rounded-sm text-center font-bold transition-all border ${
                commandTab === "tasks"
                  ? "bg-[#eab308] text-[#18181b] border-[#2d241d] shadow-xs"
                  : "bg-[#fffdfa] text-[#4a3b2c] border-[#2d241d] hover:bg-[#ebdcc0]"
              }`}
            >
              ✓ tasks
            </button>
            <button
              onClick={() => setCommandTab("askme")}
              className={`py-0.5 px-1 rounded-sm text-center font-bold transition-all border ${
                commandTab === "askme"
                  ? "bg-[#eab308] text-[#18181b] border-[#2d241d] shadow-xs"
                  : "bg-[#fffdfa] text-[#4a3b2c] border-[#2d241d] hover:bg-[#ebdcc0]"
              }`}
            >
              🗣 ask me
            </button>
            <button
              onClick={() => setCommandTab("triggers")}
              className={`py-0.5 px-1 rounded-sm text-center font-bold transition-all border ${
                commandTab === "triggers"
                  ? "bg-[#eab308] text-[#18181b] border-[#2d241d] shadow-xs"
                  : "bg-[#fffdfa] text-[#4a3b2c] border-[#2d241d] hover:bg-[#ebdcc0]"
              }`}
            >
              ⏰ triggers
            </button>
          </div>

          {/* Row 2: memory, graph, activity, commands, workers */}
          <div className="grid grid-cols-5 gap-1">
            <button
              onClick={() => setCommandTab("memory")}
              className={`py-0.5 px-1 rounded-sm text-center font-bold transition-all border ${
                commandTab === "memory"
                  ? "bg-[#eab308] text-[#18181b] border-[#2d241d] shadow-xs"
                  : "bg-[#fffdfa] text-[#4a3b2c] border-[#2d241d] hover:bg-[#ebdcc0]"
              }`}
            >
              🧠 memory
            </button>
            <button
              onClick={() => setCommandTab("graph")}
              className={`py-0.5 px-1 rounded-sm text-center font-bold transition-all border ${
                commandTab === "graph"
                  ? "bg-[#eab308] text-[#18181b] border-[#2d241d] shadow-xs"
                  : "bg-[#fffdfa] text-[#4a3b2c] border-[#2d241d] hover:bg-[#ebdcc0]"
              }`}
            >
              🕸 graph
            </button>
            <button
              onClick={() => setCommandTab("activity")}
              className={`py-0.5 px-1 rounded-sm text-center font-bold transition-all border ${
                commandTab === "activity"
                  ? "bg-[#eab308] text-[#18181b] border-[#2d241d] shadow-xs"
                  : "bg-[#fffdfa] text-[#4a3b2c] border-[#2d241d] hover:bg-[#ebdcc0]"
              }`}
            >
              🔔 activity
            </button>
            <button
              onClick={() => setCommandTab("commands")}
              className={`py-0.5 px-1 rounded-sm text-center font-bold transition-all border ${
                commandTab === "commands"
                  ? "bg-[#eab308] text-[#18181b] border-[#2d241d] shadow-xs"
                  : "bg-[#fffdfa] text-[#4a3b2c] border-[#2d241d] hover:bg-[#ebdcc0]"
              }`}
            >
              &lt;·&gt; commands
            </button>
            <button
              onClick={() => setCommandTab("workers")}
              className={`py-0.5 px-1 rounded-sm text-center font-bold transition-all border ${
                commandTab === "workers"
                  ? "bg-[#eab308] text-[#18181b] border-[#2d241d] shadow-xs"
                  : "bg-[#fffdfa] text-[#4a3b2c] border-[#2d241d] hover:bg-[#ebdcc0]"
              }`}
            >
              👥 workers
            </button>
          </div>
        </div>
      </div>

      {/* 2. Middle Live Stage (Terminal / Tasks / Memory / Activity) */}
      <div className="flex-1 bg-[#fffdfa] overflow-hidden flex flex-col relative border-b-2 border-[#2d241d]">
        {/* Terminal Sub-header Bar (live · agy CLI + restart + zoom controls) */}
        {commandTab === "terminal" && (
          <div className="bg-[#fbf9f4] px-3 py-1 border-b border-[#2d241d] flex items-center justify-between text-[11px] font-mono shrink-0">
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1.5">
                <span className={`w-2 h-2 inline-block ${isHeadChefWorking ? "bg-[#22c55e] animate-pulse" : "bg-[#eab308]"}`}></span>
                <span className="font-bold text-[#2d241d]">{isHeadChefWorking ? "live · agy CLI" : "agy standby"}</span>
              </div>
              <button
                onClick={async () => {
                  if (typeof window !== "undefined" && window.agentgrid?.restartAgy) {
                    await window.agentgrid.restartAgy(currentProject?.path, "headchef");
                  }
                }}
                className="px-1.5 py-0.2 bg-[#fffdfa] hover:bg-[#ebdcc0] text-[#2d241d] border border-[#2d241d] rounded-xs text-[9px] font-bold shadow-2xs"
                title="Restart agy CLI interactive session in this workspace"
              >
                🔄 restart agy
              </button>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setFontSize((s) => Math.max(9, s - 1))}
                className="w-5 h-5 flex items-center justify-center bg-[#fffdfa] border border-[#2d241d] rounded-xs font-bold hover:bg-[#ebdcc0]"
              >
                -
              </button>
              <span className="px-1 text-[10px] text-[#4a3b2c] font-bold">{fontSize}px</span>
              <button
                onClick={() => setFontSize((s) => Math.min(20, s + 1))}
                className="w-5 h-5 flex items-center justify-center bg-[#fffdfa] border border-[#2d241d] rounded-xs font-bold hover:bg-[#ebdcc0]"
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* VIEW 1: Real-Time Interactive Terminal */}
        {commandTab === "terminal" && (
          <div className="flex-1 flex flex-col overflow-hidden bg-[#fffdfa] relative">
            <XtermTerminal
              activeRole={activeTab}
              currentWorkspacePath={currentProject?.path}
              fontSize={fontSize}
            />

            {/* Terminal Context Status Bar matching Munder Difflin */}
            <div className="bg-[#fbf9f4] px-3 py-1 border-t border-[#2d241d] flex items-center justify-between text-[10px] font-mono text-[#5c4a39] shrink-0">
              <div className="flex items-center space-x-2">
                <span>ctx 146k/1000k (15%)</span>
                <span>/rc</span>
              </div>
              <div className="text-[9px] text-[#78614d]">
                ▶▶ bypass permissions on (shift+tab to cycle) · ↵ for agents
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: Order Tasks Board */}
        {commandTab === "tasks" && (
          <div className="flex-1 p-3 overflow-y-auto space-y-2 bg-[#fffdfa] text-xs font-mono">
            <div className="text-[#2d241d] font-bold border-b border-[#2d241d]/20 pb-1">
              ✓ Active Tickets ({tickets.length})
            </div>
            {tickets.length === 0 ? (
              <div className="text-[#78614d] italic p-4 text-center">No active tickets. Place an order in QUEUE below.</div>
            ) : (
              tickets.map((t) => (
                <div key={t.id} className="p-2 bg-[#fbf9f4] border border-[#2d241d] rounded-sm space-y-1 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#2d241d] truncate">{t.title}</span>
                    <span className="px-1.5 py-0.2 rounded-xs text-[9px] font-bold bg-[#eab308] text-[#18181b] border border-[#2d241d]">
                      {t.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#5c4a39] flex items-center justify-between">
                    <span>Assignee: <strong>{t.assignee?.toUpperCase()}</strong></span>
                    <span className="text-[9px] text-[#78614d]">{t.id}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* VIEW 3: Memory Ledger */}
        {commandTab === "memory" && (
          <div className="flex-1 flex flex-col overflow-hidden bg-[#fffdfa] text-xs font-mono">
            <div className="bg-[#fbf9f4] p-2 border-b border-[#2d241d] flex items-center justify-between">
              <div className="flex items-center space-x-1 overflow-x-auto">
                <span className="text-[#2d241d] font-bold text-[10px] mr-1 shrink-0">LEDGER:</span>
                {memoryFiles.map((file) => (
                  <button
                    key={file.name}
                    onClick={() => {
                      setSelectedFileName(file.name);
                      setSelectedFileContent(file.content);
                    }}
                    className={`px-2 py-0.5 rounded-sm text-[10px] transition-all shrink-0 border ${
                      selectedFileName === file.name
                        ? "bg-[#eab308] text-[#18181b] border-[#2d241d] font-bold"
                        : "bg-[#fffdfa] text-[#5c4a39] border-[#2d241d] hover:bg-[#ebdcc0]"
                    }`}
                  >
                    📄 {file.name}
                  </button>
                ))}
              </div>

              <button
                onClick={loadMemoryLedger}
                disabled={isLoadingMemory}
                className="px-2 py-0.5 bg-[#fffdfa] hover:bg-[#ebdcc0] text-[#2d241d] rounded-sm border border-[#2d241d] text-[10px] font-bold shrink-0 shadow-xs"
              >
                🔄 Refresh
              </button>
            </div>

            <div className="flex-1 p-3 overflow-y-auto bg-[#fffdfa] select-text">
              <div className="text-[10px] text-[#5c4a39] mb-1.5 flex items-center justify-between border-b border-[#2d241d]/10 pb-1">
                <span className="font-bold">File: <span className="text-[#b45309]">{selectedFileName}</span></span>
                <span>{selectedFileContent.split("\n").length} lines</span>
              </div>
              <pre className="text-[#2d241d] text-[11px] leading-relaxed whitespace-pre-wrap font-mono select-text bg-[#fbf9f4] p-2.5 rounded-sm border border-[#2d241d]/30">
                {selectedFileContent}
              </pre>
            </div>
          </div>
        )}

        {/* VIEW 4: Activity Feed */}
        {commandTab === "activity" && (
          <div className="flex-1 p-3 overflow-y-auto space-y-1.5 bg-[#fffdfa] text-[10px] font-mono">
            <div className="text-[#2d241d] font-bold pb-1 border-b border-[#2d241d]/20">
              🔔 Service Bell Router Dispatches ({messages.length})
            </div>
            {messages.length === 0 ? (
              <div className="text-[#78614d] italic p-2">No router dispatches recorded yet.</div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="p-1.5 bg-[#fbf9f4] border border-[#2d241d] rounded-sm flex items-center justify-between shadow-xs">
                  <div className="truncate">
                    <span className="font-bold text-[#b45309]">{m.from}</span>
                    <span className="text-[#78614d]"> ──► </span>
                    <span className="font-bold text-[#15803d]">{m.to}: </span>
                    <span className="text-[#2d241d]">{m.subject}</span>
                  </div>
                  <span className="text-[8px] text-[#78614d] ml-2 shrink-0">{m.act}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* VIEW 5: Generic State for Other Tabs */}
        {["monitor", "askme", "triggers", "graph", "commands", "workers"].includes(commandTab) && (
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-2 text-[#5c4a39] font-mono">
            <div className="text-3xl">⚙️</div>
            <div className="font-bold text-[#2d241d] uppercase tracking-wide">{commandTab} Panel Active</div>
            <p className="text-xs max-w-xs text-[#78614d]">
              Live telemetry is active. All terminal outputs, commands, and tasks stream to the <strong>&gt;_ terminal</strong> view.
            </p>
          </div>
        )}
      </div>

      {/* 3. Bottom Queue & Input Section (Exact Munder Difflin Style) */}
      <div className="bg-[#fbf9f4] p-2.5 flex flex-col space-y-1.5 font-mono">
        {/* Workspace directory bar */}
        <div className={`flex items-center justify-between px-2 py-0.5 rounded-sm border text-[10px] ${
          currentProject?.path ? "bg-[#fffdfa] border-[#2d241d]" : "bg-[#fee2e2] border-[#dc2626] animate-pulse"
        }`}>
          <div className="flex items-center space-x-1.5 min-w-0 pr-1">
            <span>📂</span>
            <span className="truncate font-bold text-[#2d241d]">
              {currentProject?.path || "⚠️ Choose workspace folder before instructing..."}
            </span>
          </div>
          <button
            onClick={handleChooseFolder}
            className="px-2 py-0.2 bg-[#fffdfa] hover:bg-[#ebdcc0] text-[#2d241d] font-bold rounded-xs border border-[#2d241d] shrink-0 text-[9px] shadow-xs"
          >
            {currentProject?.path ? "Change" : "📁 Choose Folder"}
          </button>
        </div>

        {/* QUEUE Header */}
        <div className="flex items-center justify-between text-[11px] font-bold text-[#2d241d] px-0.5">
          <span>QUEUE</span>
        </div>

        {/* Textarea Form */}
        <form onSubmit={handleSend} className="space-y-1.5">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder={currentProject?.path ? "Message Michael" : "Select workspace directory above first..."}
            rows={2}
            className="w-full bg-[#fffdfa] border-2 border-[#2d241d] rounded-sm p-2 text-xs text-[#2d241d] placeholder:text-[#948170] focus:outline-none focus:ring-1 focus:ring-[#eab308] resize-none font-sans shadow-inner"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={handleChooseFolder}
                className="px-2.5 py-0.5 bg-[#fffdfa] hover:bg-[#ebdcc0] text-[#2d241d] rounded-sm border border-[#2d241d] text-[10px] font-bold shadow-xs flex items-center space-x-1"
              >
                <span>+</span>
                <span>files</span>
              </button>

              <button
                type="button"
                className="px-2.5 py-0.5 bg-[#fffdfa] hover:bg-[#ebdcc0] text-[#2d241d] rounded-sm border border-[#2d241d] text-[10px] font-bold shadow-xs flex items-center space-x-1"
              >
                <span>🎙</span>
                <span>voice</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={!inputMessage.trim()}
              className="px-4 py-1 bg-[#eab308] hover:bg-[#ca8a04] disabled:bg-[#e2d8c3] disabled:text-[#948170] text-[#18181b] font-black text-xs rounded-sm border-2 border-[#2d241d] shadow-sm transition-all flex items-center space-x-1 cursor-pointer"
            >
              <span>send</span>
              <span>➔</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
