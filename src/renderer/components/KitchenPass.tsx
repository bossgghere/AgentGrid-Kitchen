import React, { useState, useRef, useEffect } from "react";
import { useKitchenStore } from "../store/kitchenStore.ts";
import { CHEF_ROLES, CHEF_TITLES } from "../../domain/constants/paths.constants.ts";
import type { ChefRole } from "../../domain/types/hive.types.ts";

export const KitchenPass: React.FC = () => {
  const { activeTab, setActiveTab, terminalLogs, writeToAgent, activeAgents } = useKitchenStore();
  const [inputText, setInputText] = useState("");
  const terminalRef = useRef<HTMLDivElement>(null);

  const activeLog = terminalLogs[activeTab] || "";
  const currentProcess = activeAgents.find((a) => a.role === activeTab && a.status === "running");
  const isRunning = Boolean(currentProcess);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [activeLog, activeTab]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    await writeToAgent(activeTab, inputText + "\n");
    setInputText("");
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xl">
      {/* Header Tabs */}
      <div className="flex items-center justify-between bg-slate-950 px-2 py-1 border-b border-slate-800 overflow-x-auto">
        <div className="flex items-center space-x-1">
          {CHEF_ROLES.map((role) => {
            const isActive = activeTab === role;
            const proc = activeAgents.find((a) => a.role === role && a.status === "running");
            return (
              <button
                key={role}
                onClick={() => setActiveTab(role)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-t-md text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-slate-900 text-amber-400 border-t-2 border-amber-500 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                }`}
              >
                <span>{CHEF_TITLES[role]}</span>
                {proc && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
              </button>
            );
          })}
        </div>

        {/* Live Station Status Pill */}
        <div className="flex items-center space-x-2 text-[10px] font-mono px-2 shrink-0">
          {isRunning ? (
            <span className="flex items-center space-x-1 text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>PID: {currentProcess?.pid} (ACTIVE)</span>
            </span>
          ) : (
            <span className="text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              Station Ready
            </span>
          )}
        </div>
      </div>

      {/* Terminal Screen Body */}
      <div
        ref={terminalRef}
        className="flex-1 p-4 font-mono text-xs bg-slate-950/90 text-emerald-400 overflow-y-auto whitespace-pre-wrap select-text border-b border-slate-800 leading-relaxed"
      >
        {activeLog}
      </div>

      {/* Interactive Command Input Bar */}
      <form onSubmit={handleSend} className="flex items-center px-3 py-2 bg-slate-950 space-x-2">
        <span className="text-amber-500 font-bold text-xs">{activeTab} &gt;</span>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={isRunning ? "Type command to send to chef terminal..." : "Station online. Logs streaming live."}
          className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="px-3 py-1 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-white font-bold text-xs rounded transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
};
