import React, { useState, useRef, useEffect } from "react";
import { useKitchenStore } from "../store/kitchenStore.ts";
import { CHEF_ROLES, CHEF_TITLES } from "../../domain/constants/paths.constants.ts";
import type { ChefRole } from "../../domain/types/hive.types.ts";

export const KitchenPass: React.FC = () => {
  const { activeTab, setActiveTab, terminalLogs, activeAgents } = useKitchenStore();
  const terminalRef = useRef<HTMLDivElement>(null);

  const activeLog = terminalLogs[activeTab] || "";
  const currentProcess = activeAgents.find((a) => a.role === activeTab && a.status === "running");
  const isRunning = Boolean(currentProcess);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [activeLog, activeTab]);

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
        className="flex-1 p-4 font-mono text-xs bg-slate-950/90 text-emerald-400 overflow-y-auto whitespace-pre-wrap select-text leading-relaxed"
      >
        {activeLog}
      </div>
    </div>
  );
};
