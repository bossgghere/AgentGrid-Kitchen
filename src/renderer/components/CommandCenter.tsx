import React, { useState, useRef, useEffect } from "react";
import AnsiConverter from "ansi-to-html";
import { useKitchenStore, type PassTab } from "../store/kitchenStore.ts";
import { XtermTerminal } from "./XtermTerminal.tsx";
import { CHEF_TITLES } from "../../domain/constants/paths.constants.ts";
import type { ChefRole } from "../../domain/types/hive.types.ts";

const ansiConverter = new AnsiConverter({
  fg: "#34d399",
  bg: "#0b1019",
  newline: true,
  escapeXML: true,
  colors: {
    1: "#f87171",
    2: "#4ade80",
    3: "#fbbf24",
    4: "#60a5fa",
    5: "#c084fc",
    6: "#38bdf8",
    7: "#f1f5f9",
  },
});

export const CommandCenter: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    terminalLogs,
    activeAgents,
    activeBrigadeChefs,
    projects,
    activeProjectId,
    selectProject,
    addProject,
    chooseDirectoryForProject,
    chatMessages,
    sendChatMessage,
    tickets,
    messages,
    hooks,
  } = useKitchenStore();

  const [commandTab, setCommandTab] = useState<"terminal" | "chat" | "preview" | "memory" | "tasks" | "activity">("terminal");
  const [inputMessage, setInputMessage] = useState("");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [previewTimestamp, setPreviewTimestamp] = useState<number>(Date.now());
  const [previewUrl, setPreviewUrl] = useState<string>("http://127.0.0.1:5274");

  // Memory ledger states
  const [memoryFiles, setMemoryFiles] = useState<{ name: string; content: string }[]>([]);
  const [selectedFileName, setSelectedFileName] = useState<string>("recipe_plan.md");
  const [selectedFileContent, setSelectedFileContent] = useState<string>("");
  const [isLoadingMemory, setIsLoadingMemory] = useState<boolean>(false);

  const terminalRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const currentProject = projects.find((p) => p.id === activeProjectId) || projects[0];
  const activeLog = terminalLogs[activeTab] || "";
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
      setSelectedFileContent("# No files found in ledger yet.\n\nInstruct the Head Chef to cook your project files!");
    }
    setIsLoadingMemory(false);
  };

  useEffect(() => {
    if (commandTab === "memory") {
      loadMemoryLedger();
    } else if (commandTab === "preview") {
      if (typeof window !== "undefined" && window.agentgrid?.getPreviewUrl) {
        window.agentgrid.getPreviewUrl(currentProject?.path).then((url) => {
          if (url) setPreviewUrl(url);
        });
      }
    }
  }, [commandTab, activeProjectId]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [activeLog, activeTab]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    if (!currentProject?.path || currentProject.path.trim() === "") {
      const chosen = await chooseDirectoryForProject(currentProject?.id || "proj-default");
      if (!chosen) {
        return; // User cancelled folder selection
      }
    }

    const msg = inputMessage;
    setInputMessage("");
    setCommandTab("terminal"); // Auto-switch to terminal to watch the execution live!

    // If user typed a direct CLI command (e.g. 'agy ...', 'ls', 'npm'), forward straight to the real terminal PTY!
    const isDirectCli = /^(agy|npm|npx|node|git|ls|cd|pwd|clear|echo|cat|touch|mkdir|python|python3)\b/i.test(msg.trim());
    if (isDirectCli && typeof window !== "undefined" && window.agentgrid?.writeToAgent) {
      window.agentgrid.writeToAgent("headchef", `${msg.trim()}\n`);
      return;
    }

    await sendChatMessage(msg);
  };

  const handleChooseFolder = async () => {
    if (currentProject) {
      await chooseDirectoryForProject(currentProject.id);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1b2230] border-2 border-[#334155] rounded-xl overflow-hidden shadow-2xl">
      {/* 1. Command Center Header */}
      <div className="p-3 bg-[#0f172a] border-b border-[#334155] flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-lg">
              👨‍🍳
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black tracking-wider text-amber-300 uppercase">COMMAND CENTER</span>
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                  isHeadChefWorking ? "bg-emerald-950 text-emerald-400 border-emerald-700 animate-pulse" : "bg-slate-800 text-slate-400 border-slate-700"
                }`}>
                  {isHeadChefWorking ? "WORKING" : "IDLE"}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">Head Chef coordinates the kitchen floor</p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 text-[10px] font-mono">
            <span className="px-2 py-0.5 bg-emerald-950/80 text-emerald-400 border border-emerald-800 rounded font-bold">
              ▶ auto mode on
            </span>
          </div>
        </div>

        {/* Sub-Tabs Bar: Terminal, Chat, Tasks, Activity, Plan */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-2 text-xs font-mono">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCommandTab("terminal")}
              className={`px-2 py-1 rounded font-bold transition-all ${
                commandTab === "terminal" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              &gt;_ terminal
            </button>
            <button
              onClick={() => setCommandTab("chat")}
              className={`px-2 py-1 rounded font-bold transition-all relative ${
                commandTab === "chat" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              💬 chat
              {chatMessages.length > 1 && (
                <span className="ml-1 px-1 bg-amber-400 text-slate-950 rounded-full text-[9px]">
                  {chatMessages.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setCommandTab("preview")}
              className={`px-2 py-1 rounded font-bold transition-all ${
                commandTab === "preview" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              🌐 preview
            </button>
            <button
              onClick={() => setCommandTab("memory")}
              className={`px-2 py-1 rounded font-bold transition-all ${
                commandTab === "memory" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              🧠 memory
            </button>
            <button
              onClick={() => setCommandTab("tasks")}
              className={`px-2 py-1 rounded font-bold transition-all ${
                commandTab === "tasks" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              📋 tasks ({tickets.length})
            </button>
            <button
              onClick={() => setCommandTab("activity")}
              className={`px-2 py-1 rounded font-bold transition-all ${
                commandTab === "activity" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              🔔 activity
            </button>
          </div>

          {/* Active Station Selector when on terminal */}
          {commandTab === "terminal" && (
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as PassTab)}
              className="bg-slate-900 border border-slate-700 rounded text-[10px] text-amber-400 px-1.5 py-0.5 font-mono focus:outline-none"
            >
              <option value="master">🌟 Master Pass (All)</option>
              <option value="headchef">👨‍🍳 Head Chef</option>
              <option value="linecook">🍳 Line Cook</option>
              <option value="plating">🎨 Plating Chef</option>
              <option value="inspector">🔍 Food Inspector</option>
              <option value="pantry">📦 Pantry Scout</option>
            </select>
          )}
        </div>
      </div>

      {/* 2. Middle Live Workstage (Terminal / Chat / Tasks / Activity) */}
      <div className="flex-1 bg-[#141c28] overflow-hidden flex flex-col relative">
        {/* VIEW A: Real-Time Live Streaming Terminal */}
        {commandTab === "terminal" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Terminal Engine Bar */}
            <div className="bg-[#0f172a] px-3 py-1 border-b border-slate-800 flex items-center justify-between text-[10px] font-mono">
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-slate-300">Engine: <span className="text-amber-400 font-bold">agy CLI</span> (Google Antigravity)</span>
              </div>
              <span className="text-slate-500">PTY Raw Byte Stream • ANSI Color Mode</span>
            </div>

            <XtermTerminal activeRole={activeTab} currentWorkspacePath={currentProject?.path} />
          </div>
        )}

        {/* VIEW B: Interactive Chef Chat Stream */}
        {commandTab === "chat" && (
          <div ref={chatScrollRef} className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-[#0b1019]">
            {chatMessages.map((msg) => {
              const isUser = msg.sender === "user";
              const senderInfo = {
                user: { name: "You", icon: "👤", badgeColor: "text-slate-400", border: "border-amber-600" },
                headchef: { name: "Head Chef", icon: "👨‍🍳", badgeColor: "text-amber-400", border: "border-slate-800" },
                linecook: { name: "Line Cook", icon: "🍳", badgeColor: "text-sky-400", border: "border-sky-900/60" },
                plating: { name: "Plating Chef", icon: "🎨", badgeColor: "text-emerald-400", border: "border-emerald-900/60" },
                inspector: { name: "Food Inspector", icon: "🔍", badgeColor: "text-purple-400", border: "border-purple-900/60" },
                pantry: { name: "Pantry Scout", icon: "📦", badgeColor: "text-amber-300", border: "border-amber-900/60" },
              }[msg.sender] || { name: "Chef", icon: "🧑‍🍳", badgeColor: "text-slate-400", border: "border-slate-800" };

              return (
                <div key={msg.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                  <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 mb-0.5 px-1 font-mono">
                    <span className={`font-bold ${senderInfo.badgeColor}`}>
                      {senderInfo.icon} {senderInfo.name}
                    </span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  <div
                    className={`max-w-[92%] p-2 rounded-lg text-xs leading-relaxed ${
                      isUser
                        ? "bg-amber-600 text-slate-950 font-medium rounded-tr-none shadow"
                        : `bg-[#1e293b] border ${senderInfo.border} text-slate-200 rounded-tl-none shadow`
                    }`}
                  >
                    <div>{msg.text}</div>
                    {msg.plan && (
                      <div className="mt-2 pt-1.5 border-t border-slate-700/80 space-y-1 text-[10px] font-mono">
                        <div className="text-amber-400 font-bold uppercase">🎯 Station Allocations:</div>
                        {msg.plan.linecook && <div>🍳 Line Cook: {msg.plan.linecook}</div>}
                        {msg.plan.plating && <div>🎨 Plating Chef: {msg.plan.plating}</div>}
                        {msg.plan.inspector && <div>🔍 Food Inspector: {msg.plan.inspector}</div>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW C: Order Tickets Board */}
        {commandTab === "tasks" && (
          <div className="flex-1 p-3 overflow-y-auto space-y-2 bg-[#0b1019] text-xs font-mono">
            {tickets.length === 0 ? (
              <div className="text-slate-500 italic p-4 text-center">No active tickets. Place an order below.</div>
            ) : (
              tickets.map((t) => (
                <div key={t.id} className="p-2.5 bg-[#1e293b] border border-slate-700 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 truncate">{t.title}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      t.status === "in_progress" ? "bg-emerald-950 text-emerald-400 border border-emerald-800 animate-pulse" : "bg-slate-800 text-slate-400"
                    }`}>
                      {t.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Assignee: <span className="text-amber-400 font-bold">{t.assignee?.toUpperCase()}</span></span>
                    <span className="text-[9px] text-slate-500">{t.id}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* VIEW D: Activity & Dispatches */}
        {commandTab === "activity" && (
          <div className="flex-1 p-3 overflow-y-auto space-y-1.5 bg-[#0b1019] text-[10px] font-mono">
            <div className="text-amber-400 font-bold pb-1 border-b border-slate-800">
              🔔 Service Bell Router Dispatches ({messages.length})
            </div>
            {messages.length === 0 ? (
              <div className="text-slate-500 italic p-2">No router dispatches recorded yet.</div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="p-1.5 bg-[#1e293b] border border-slate-800 rounded flex items-center justify-between">
                  <div className="truncate">
                    <span className="text-amber-400 font-bold">{m.from}</span>
                    <span className="text-slate-500"> ──► </span>
                    <span className="text-emerald-400 font-bold">{m.to}: </span>
                    <span className="text-slate-300">{m.subject}</span>
                  </div>
                  <span className="text-[8px] text-slate-500 ml-2 shrink-0">{m.act}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* VIEW E: Live In-App Dish / Website Preview */}
        {commandTab === "preview" && (
          <div className="flex-1 flex flex-col overflow-hidden bg-[#0b1019]">
            {/* Browser Control Bar */}
            <div className="bg-[#0f172a] px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-slate-400 text-[11px] truncate max-w-[180px]">{previewUrl}</span>
                <button
                  onClick={() => setPreviewTimestamp(Date.now())}
                  title="Hot Reload Preview"
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded border border-slate-700 text-[10px] flex items-center space-x-1"
                >
                  <span>🔄</span>
                  <span>Reload</span>
                </button>
                <button
                  onClick={() => {
                    if (typeof window !== "undefined" && window.agentgrid?.openExternal) {
                      window.agentgrid.openExternal(previewUrl);
                    }
                  }}
                  title="Open in System Browser"
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-[10px] flex items-center space-x-1"
                >
                  <span>🌐</span>
                  <span>External</span>
                </button>
              </div>

              {/* Responsive Device Switcher */}
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded p-0.5 space-x-0.5">
                <button
                  onClick={() => setPreviewDevice("desktop")}
                  className={`px-2 py-0.5 rounded text-[10px] transition-all ${
                    previewDevice === "desktop" ? "bg-amber-500 text-slate-950 font-bold shadow" : "text-slate-400 hover:text-slate-200"
                  }`}
                  title="Desktop (100% width)"
                >
                  🖥️ 100%
                </button>
                <button
                  onClick={() => setPreviewDevice("tablet")}
                  className={`px-2 py-0.5 rounded text-[10px] transition-all ${
                    previewDevice === "tablet" ? "bg-amber-500 text-slate-950 font-bold shadow" : "text-slate-400 hover:text-slate-200"
                  }`}
                  title="Tablet (768px width)"
                >
                  📱 Tablet
                </button>
                <button
                  onClick={() => setPreviewDevice("mobile")}
                  className={`px-2 py-0.5 rounded text-[10px] transition-all ${
                    previewDevice === "mobile" ? "bg-amber-500 text-slate-950 font-bold shadow" : "text-slate-400 hover:text-slate-200"
                  }`}
                  title="Mobile (375px width)"
                >
                  📱 Mobile
                </button>
              </div>
            </div>

            {/* Iframe Viewport Container */}
            <div className="flex-1 overflow-auto p-2 flex items-center justify-center bg-[#070b12]">
              <div
                className={`h-full transition-all duration-300 flex flex-col bg-white overflow-hidden shadow-2xl ${
                  previewDevice === "desktop"
                    ? "w-full rounded-none"
                    : previewDevice === "tablet"
                    ? "w-[768px] max-w-full rounded-xl border-4 border-slate-700"
                    : "w-[375px] max-w-full rounded-2xl border-4 border-slate-700"
                }`}
              >
                <iframe
                  key={previewTimestamp}
                  src={`${previewUrl}/?t=${previewTimestamp}`}
                  title="AgentGrid Dish Preview"
                  className="w-full flex-1 border-none bg-white"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                />
              </div>
            </div>
          </div>
        )}

        {/* VIEW F: Memory Ledger & Master Recipe Plan */}
        {commandTab === "memory" && (
          <div className="flex-1 flex flex-col overflow-hidden bg-[#0b1019] text-xs font-mono">
            {/* Memory Toolbar & File Chips */}
            <div className="bg-[#0f172a] p-2 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-1.5 overflow-x-auto">
                <span className="text-amber-400 font-bold text-[10px] mr-1 shrink-0">LEDGER:</span>
                {memoryFiles.map((file) => (
                  <button
                    key={file.name}
                    onClick={() => {
                      setSelectedFileName(file.name);
                      setSelectedFileContent(file.content);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] transition-all shrink-0 border ${
                      selectedFileName === file.name
                        ? "bg-amber-500/20 text-amber-300 border-amber-500 font-bold"
                        : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    📄 {file.name}
                  </button>
                ))}
              </div>

              <button
                onClick={loadMemoryLedger}
                disabled={isLoadingMemory}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded border border-slate-700 text-[10px] shrink-0 font-bold"
              >
                🔄 Refresh
              </button>
            </div>

            {/* File Viewer Content */}
            <div className="flex-1 p-3 overflow-y-auto bg-[#0b1019] select-text">
              <div className="text-[10px] text-slate-500 mb-2 flex items-center justify-between border-b border-slate-800/80 pb-1">
                <span className="text-slate-400 font-bold">File: <span className="text-amber-400">{selectedFileName}</span></span>
                <span>{selectedFileContent.split("\n").length} lines • {selectedFileContent.length} chars</span>
              </div>
              <pre className="text-slate-300 text-[11px] leading-relaxed whitespace-pre-wrap font-mono select-text bg-[#141c28] p-3 rounded-lg border border-slate-800">
                {selectedFileContent}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* 3. Bottom Queue & Input Section (Matches Munder Difflin bottom right) */}
      <div className="bg-[#0f172a] border-t-2 border-[#334155] p-3 flex flex-col space-y-2">
        {/* Workspace Folder Bar */}
        <div className={`flex items-center justify-between px-2.5 py-1 rounded border text-[11px] font-mono transition-all ${
          currentProject?.path ? "bg-[#1e293b] border-slate-700" : "bg-amber-950/70 border-amber-600 animate-pulse"
        }`}>
          <div className="flex items-center space-x-1.5 min-w-0 pr-2">
            <span className="text-amber-400 shrink-0">📂</span>
            <span className={`truncate ${currentProject?.path ? "text-slate-300" : "text-amber-300 font-bold"}`} title={currentProject?.path}>
              {currentProject?.path || "⚠️ Choose project workspace directory first..."}
            </span>
          </div>
          <button
            onClick={handleChooseFolder}
            className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all shrink-0 ${
              currentProject?.path
                ? "bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700"
                : "bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold shadow"
            }`}
          >
            {currentProject?.path ? "Change" : "📁 Choose Folder"}
          </button>
        </div>

        {/* Input Queue Header */}
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-0.5">
          <span className="font-extrabold text-amber-400 tracking-wider">QUEUE</span>
          <span>Talk to Head Chef • Directs the Floor</span>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="space-y-2">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder={
              currentProject?.path
                ? "Message Head Chef (e.g. Build a modern landing page with hero & navbar)..."
                : "⚠️ Select your project folder above before instructing Head Chef..."
            }
            rows={2}
            className="w-full bg-[#141c28] border border-slate-700 rounded-lg p-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-400 font-sans resize-none"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1 text-[11px] text-slate-400 font-mono">
              <button
                type="button"
                onClick={handleChooseFolder}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-[10px]"
              >
                + files
              </button>
              <span className="text-[10px] text-slate-500 ml-1">↵ to send</span>
            </div>

            <button
              type="submit"
              disabled={!inputMessage.trim()}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-extrabold text-xs rounded-lg shadow-md transition-all flex items-center space-x-1"
            >
              <span>Send</span>
              <span>➔</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
