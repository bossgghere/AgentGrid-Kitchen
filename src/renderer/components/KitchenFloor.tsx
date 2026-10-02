import React from "react";
import { useKitchenStore } from "../store/kitchenStore.ts";
import { CHEF_TITLES } from "../../domain/constants/paths.constants.ts";
import type { ChefRole } from "../../domain/types/hive.types.ts";

const CHEF_ICONS: Record<ChefRole, string> = {
  headchef: "👨‍🍳",
  plating: "🎨",
  linecook: "🍳",
  pantry: "📦",
  inspector: "🔍",
};

const STATION_NAMES: Record<ChefRole, string> = {
  headchef: "Command Pass",
  plating: "Plating & Design Table",
  linecook: "Hot Stove Station",
  pantry: "Research & Pantry Bench",
  inspector: "QA Inspection Counter",
};

export const KitchenFloor: React.FC = () => {
  const {
    activeBrigadeChefs,
    activeTab,
    setActiveTab,
    registry,
    activeAgents,
    clearBrigade,
  } = useKitchenStore();

  const hasActiveChefs = activeBrigadeChefs.length > 0;

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xl">
      {/* Floor Header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-slate-950 border-b border-slate-800">
        <div>
          <h2 className="text-xs font-extrabold tracking-wider text-slate-100 uppercase flex items-center space-x-1.5">
            <span>🧑‍🍳</span>
            <span>Kitchen Floor</span>
          </h2>
          <p className="text-[10px] text-slate-400">
            {hasActiveChefs
              ? `${activeBrigadeChefs.length} Station Chef${activeBrigadeChefs.length > 1 ? "s" : ""} on Duty`
              : "Preheated • Standby"}
          </p>
        </div>

        {hasActiveChefs && (
          <button
            onClick={clearBrigade}
            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 text-[10px] font-bold rounded transition-colors"
            title="Reset active floor stations"
          >
            Reset
          </button>
        )}
      </div>

      {/* Floor Body */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2.5">
        {!hasActiveChefs ? (
          /* Empty Standby State */
          <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-2xl shadow-inner">
              🍳
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-300">Kitchen is Quiet</h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                No station chefs on the floor. Send an order in the Chat on the right to summon the brigade.
              </p>
            </div>

            <div className="w-full pt-4 border-t border-slate-800/80 space-y-1.5 text-[10px] text-slate-500 font-mono">
              <div className="flex items-center justify-between">
                <span>Stove Heat:</span>
                <span className="text-emerald-400 font-bold">READY (450°F)</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Pass Status:</span>
                <span className="text-slate-400">AWAITING ORDER</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Auto-Spawn:</span>
                <span className="text-amber-400">ENABLED</span>
              </div>
            </div>
          </div>
        ) : (
          /* Active Summoned Chefs */
          activeBrigadeChefs.map((role) => {
            const isSelected = activeTab === role;
            const proc = activeAgents.find((a) => a.role === role && a.status === "running");
            const entry = registry[role];
            const isWorking = Boolean(proc) || entry?.status === "working";

            return (
              <div
                key={role}
                onClick={() => setActiveTab(role)}
                className={`p-3 rounded-lg border transition-all cursor-pointer space-y-2 ${
                  isSelected
                    ? "bg-slate-800/90 border-amber-500 shadow-md shadow-amber-500/10"
                    : "bg-slate-950/70 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{CHEF_ICONS[role]}</span>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-100 flex items-center space-x-1.5">
                        <span>{CHEF_TITLES[role]}</span>
                        {isSelected && <span className="text-amber-400 text-[10px]">● Focus</span>}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono">{STATION_NAMES[role]}</p>
                    </div>
                  </div>

                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                      isWorking
                        ? "bg-emerald-950/80 text-emerald-400 border-emerald-800 animate-pulse"
                        : "bg-slate-900 text-slate-400 border-slate-800"
                    }`}
                  >
                    {isWorking ? "🟢 COOKING" : "🟡 STANDBY"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60 font-mono">
                  <span>{proc ? `PID: ${proc.pid}` : "Auto-Spawned"}</span>
                  <span className="text-amber-400 font-semibold hover:underline">
                    View Terminal ──►
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
