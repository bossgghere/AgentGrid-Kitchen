import React from "react";
import { useKitchenStore } from "../store/kitchenStore.ts";
import { CHEF_ROLES, CHEF_TITLES } from "../../domain/constants/paths.constants.ts";
import type { ChefRole } from "../../domain/types/hive.types.ts";

const CHEF_ICONS: Record<ChefRole, string> = {
  headchef: "👨‍🍳",
  plating: "🎨",
  linecook: "🍳",
  pantry: "📦",
  inspector: "🔍",
};

export const KitchenRoster: React.FC = () => {
  const { registry, activeAgents, spawnAgent, killAgent, activeTab, setActiveTab } = useKitchenStore();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 shadow-md flex flex-col space-y-2">
      {/* Title & Stats */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-slate-200">🧑‍🍳 Kitchen Brigade Roster</span>
          <span className="text-[10px] text-slate-500 font-mono">|</span>
          <span className="text-[10px] text-slate-400">Station Chef Telemetry & Quick Focus</span>
        </div>
        <div className="text-[10px] text-slate-400 font-mono">
          Active Station Processes: <span className="text-emerald-400 font-bold">{activeAgents.length}</span> / 5
        </div>
      </div>

      {/* 5-Column Horizontal Chef Stations Grid */}
      <div className="grid grid-cols-5 gap-2">
        {CHEF_ROLES.map((role) => {
          const entry = registry[role];
          const isRunning = activeAgents.some((a) => a.role === role && a.status === "running");
          const isSelected = activeTab === role;
          const status = entry?.status || "idle";

          let statusBadge = "🟡 Idle";
          let badgeColor = "bg-amber-950/60 text-amber-400 border-amber-800/50";

          if (status === "working") {
            statusBadge = "🟢 Working";
            badgeColor = "bg-emerald-950/60 text-emerald-400 border-emerald-800/50";
          } else if (status === "blocked") {
            statusBadge = "🔴 Blocked";
            badgeColor = "bg-rose-950/60 text-rose-400 border-rose-800/50";
          }

          return (
            <div
              key={role}
              onClick={() => setActiveTab(role)}
              className={`p-2 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                isSelected
                  ? "bg-slate-800/90 border-amber-500/70 shadow-sm shadow-amber-500/10"
                  : "bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-950"
              }`}
            >
              <div className="flex items-center space-x-2 min-w-0 pr-1">
                <span className="text-lg shrink-0">{CHEF_ICONS[role]}</span>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-200 truncate flex items-center space-x-1">
                    <span>{role.toUpperCase()}</span>
                    {isSelected && <span className="text-[9px] text-amber-400">●</span>}
                  </div>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <span className={`px-1.5 py-0.2 rounded border text-[8px] font-semibold ${badgeColor}`}>
                      {statusBadge}
                    </span>
                  </div>
                </div>
              </div>

              <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                {isRunning ? (
                  <button
                    onClick={() => killAgent(role)}
                    className="px-2 py-0.5 bg-rose-600/80 hover:bg-rose-500 text-white font-bold text-[9px] rounded transition-colors"
                  >
                    Stop
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      spawnAgent({
                        role,
                        command: "node",
                        args: ["-e", `console.log("CHEF_${role.toUpperCase()}_ONLINE")`],
                      })
                    }
                    className="px-2 py-0.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-[9px] rounded transition-colors"
                  >
                    Spawn
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
