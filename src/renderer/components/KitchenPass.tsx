import React, { useRef, useEffect } from "react";
import { useKitchenStore, type PassTab } from "../store/kitchenStore.ts";
import { CHEF_TITLES } from "../../domain/constants/paths.constants.ts";
import type { ChefRole } from "../../domain/types/hive.types.ts";

export const KitchenPass: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    terminalLogs,
    activeAgents,
    activeBrigadeChefs,
    projects,
    activeProjectId,
  } = useKitchenStore();

  const terminalRef = useRef<HTMLDivElement>(null);
  const currentProject = projects.find((p) => p.id === activeProjectId) || projects[0];
  const activeLog = terminalLogs[activeTab] || "";
  const currentProcess = activeAgents.find((a) => a.role === activeTab && a.status === "running");
  const isRunning = Boolean(currentProcess) || activeAgents.some((a) => a.status === "running");

  // Tabs: Always show "🌟 Master Pass", followed by summoned chefs
  const visibleTabs: PassTab[] = [
    "master",
    ...(activeBrigadeChefs.length > 0 ? activeBrigadeChefs : (["headchef"] as ChefRole[])),
  ];

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [activeLog, activeTab]);

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xl">
      {/* Header Tabs */}
      <div className="flex items-center justify-between bg-slate-950 px-2 py-1.5 border-b border-slate-800 overflow-x-auto">
        <div className="flex items-center space-x-1">
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab;
            const proc = tab !== "master" ? activeAgents.find((a) => a.role === tab && a.status === "running") : null;
            const tabTitle = tab === "master" ? "🌟 Master Pass (Live Feed)" : CHEF_TITLES[tab as ChefRole];

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-t-md text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-slate-900 text-amber-400 border-t-2 border-amber-500 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                }`}
              >
                <span>{tabTitle}</span>
                {proc && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
              </button>
            );
          })}
        </div>

        {/* Live Station Status Pill */}
        <div className="flex items-center space-x-2 text-[10px] font-mono px-2 shrink-0">
          <span className="text-slate-500 truncate max-w-[200px]" title={currentProject?.path}>
            📂 {currentProject?.name}
          </span>
          {isRunning ? (
            <span className="flex items-center space-x-1 text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>ACTIVE DISH</span>
            </span>
          ) : (
            <span className="text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              Pass Ready
            </span>
          )}
        </div>
      </div>

      {/* Terminal Screen Body */}
      <div
        ref={terminalRef}
        className="flex-1 p-4 font-mono text-xs bg-slate-950/95 text-emerald-400 overflow-y-auto whitespace-pre-wrap select-text leading-relaxed font-['Menlo','Monaco','Courier_New',monospace]"
      >
        {activeLog && activeLog.trim().length > 10 ? (
          activeLog
        ) : (
          <div className="text-slate-500 space-y-2 select-none">
            <div className="text-amber-500 font-bold">
              ╔═══════════════════════════════════════════════════════════════════════╗<br />
              ║                  AGENTGRID KITCHEN — EXECUTIVE PASS                   ║<br />
              ║                  Autonomous Michelin Multi-Agent Terminal             ║<br />
              ╚═══════════════════════════════════════════════════════════════════════╝
            </div>
            <div className="pt-2 text-slate-400 space-y-1">
              <div>📁 Project Workspace : <span className={currentProject?.path ? "text-slate-200" : "text-amber-400 font-bold"}>{currentProject?.path || "⚠️ None selected (Click 'Choose Folder' in Right Panel)"}</span></div>
              <div>👨‍🍳 Active Brigade    : <span className="text-amber-400">{activeBrigadeChefs.length > 0 ? activeBrigadeChefs.join(", ") : "Standby (Waiting for order)"}</span></div>
              <div>⚡ Socket Telemetry  : <span className="text-emerald-400">/tmp/ag.sock (Online)</span></div>
            </div>
            <div className="pt-4 text-slate-500 text-[11px] leading-relaxed">
              {!currentProject?.path ? (
                <div className="text-amber-300 font-semibold bg-amber-950/40 p-2.5 rounded border border-amber-800/60">
                  👉 <span className="underline">Step 1</span>: Select your project workspace directory in the right panel to begin.<br />
                  <span className="text-slate-400 font-normal">No random directories will be used; all code and dishes will be prepared in your chosen folder.</span>
                </div>
              ) : (
                <div>
                  💡 Type a task in the <span className="text-amber-400">Chat Panel</span> on the right (e.g. <span className="text-slate-300 italic">"build a landing page with hero and features"</span>).<br />
                  The Head Chef will formulate the plan, summon the necessary station chefs to the floor, and stream execution live to this terminal.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
