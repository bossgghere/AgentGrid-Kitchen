import React, { useState } from "react";
import { useKitchenStore } from "../store/kitchenStore.ts";
import { CHEF_ROLES, CHEF_TITLES } from "../../domain/constants/paths.constants.ts";
import type { ChefRole } from "../../domain/types/hive.types.ts";

export const KitchenPass: React.FC = () => {
  const { activeTab, setActiveTab, terminalLogs, writeToAgent, activeAgents } = useKitchenStore();
  const [inputText, setInputText] = useState("");

  const activeLog = terminalLogs[activeTab] || "";
  const isRunning = activeAgents.some((a) => a.role === activeTab && a.status === "running");

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    await writeToAgent(activeTab, inputText + "\n");
    setInputText("");
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xl">
      {/* Header Tabs */}
      <div className="flex items-center bg-slate-950 px-2 py-1.5 border-b border-slate-800 overflow-x-auto">
        {CHEF_ROLES.map((role) => {
          const isActive = activeTab === role;
          return (
            <button
              key={role}
              onClick={() => setActiveTab(role)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-t-md text-xs font-semibold transition-all ${
                isActive
                  ? "bg-slate-900 text-amber-400 border-t-2 border-amber-500 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
              }`}
            >
              <span>{CHEF_TITLES[role]}</span>
            </button>
          );
        })}
      </div>

      {/* Terminal Screen Body */}
      <div className="flex-1 p-4 font-mono text-xs bg-slate-950/90 text-emerald-400 overflow-y-auto whitespace-pre-wrap select-text border-b border-slate-800 leading-relaxed">
        {activeLog}
      </div>

      {/* Interactive Command Input Bar */}
      <form onSubmit={handleSend} className="flex items-center px-3 py-2 bg-slate-950 space-x-2">
        <span className="text-amber-500 font-bold text-xs">{activeTab} &gt;</span>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={isRunning ? "Type command to send to chef terminal..." : "Chef offline. Spawn process to write commands."}
          disabled={!isRunning}
          className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!isRunning || !inputText.trim()}
          className="px-3 py-1 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-white font-bold text-xs rounded transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
};
