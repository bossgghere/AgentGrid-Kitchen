import React from "react";
import { useKitchenStore } from "../store/kitchenStore.ts";
import { CHEF_ROLES, CHEF_TITLES } from "../../domain/constants/paths.constants.ts";
import type { ChefRole } from "../../domain/types/hive.types.ts";

export const KitchenRoster: React.FC = () => {
  const { registry, activeAgents, spawnAgent, killAgent } = useKitchenStore();

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-3">
      <div className="pb-2 border-b border-slate-800">
        <h2 className="text-sm font-bold text-slate-100">🧑‍🍳 Kitchen Brigade Roster</h2>
        <p className="text-[10px] text-slate-400">Station Chef Telemetry Badges</p>
      </div>

      <div className="space-y-2 flex-1 overflow-y-auto">
        {CHEF_ROLES.map((role) => {
          const entry = registry[role];
          const isRunning = activeAgents.some((a) => a.role === role && a.status === "running");
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
              className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between"
            >
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-200">{CHEF_TITLES[role]}</div>
                <div className="flex items-center space-x-2">
                  <span className={`px-1.5 py-0.5 rounded border text-[9px] font-semibold ${badgeColor}`}>
                    {statusBadge}
                  </span>
                </div>
              </div>

              <div>
                {isRunning ? (
                  <button
                    onClick={() => killAgent(role)}
                    className="px-2 py-1 bg-rose-600/80 hover:bg-rose-500 text-white font-bold text-[10px] rounded transition-colors"
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
                    className="px-2 py-1 bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px] rounded transition-colors"
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
