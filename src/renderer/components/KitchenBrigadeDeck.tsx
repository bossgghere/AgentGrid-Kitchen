import React from "react";
import { useKitchenStore } from "../store/kitchenStore.ts";
import { CHEF_ROLES } from "../../domain/constants/paths.constants.ts";
import type { ChefRole } from "../../domain/types/hive.types.ts";

const CHEF_ICONS: Record<ChefRole, string> = {
  headchef: "👨‍🍳",
  plating: "🎨",
  linecook: "🍳",
  pantry: "📦",
  inspector: "🔍",
};

const CHEF_SHORT_NAMES: Record<ChefRole, string> = {
  headchef: "HEAD CHEF",
  linecook: "LINE COOK",
  plating: "PLATING",
  inspector: "INSPECTOR",
  pantry: "PANTRY",
};

export const KitchenBrigadeDeck: React.FC = () => {
  const {
    activeAgents,
    activeBrigadeChefs,
    registry,
    activeTab,
    setActiveTab,
    tickets,
  } = useKitchenStore();

  const isRoleWorking = (role: ChefRole) => {
    return (
      activeAgents.some((a) => a.role === role && a.status === "running") ||
      registry[role]?.status === "working"
    );
  };

  const getSubtext = (role: ChefRole): string => {
    const isSummoned = activeBrigadeChefs.includes(role);
    if (!isSummoned && role !== "headchef") return "standby";
    if (isRoleWorking(role)) {
      if (role === "headchef") return "orchestrating";
      if (role === "linecook") return "cooking code";
      if (role === "plating") return "plating UI";
      if (role === "inspector") return "validating QA";
      if (role === "pantry") return "fetching docs";
      return "working";
    }
    return "awaiting";
  };

  return (
    <div className="bg-[#0f172a] border-t-2 border-[#334155] p-2 flex items-center space-x-2 overflow-x-auto select-none">
      {/* 1. Left God Card: Head Chef */}
      <div
        onClick={() => setActiveTab("headchef")}
        className={`bg-[#fbf8f2] text-slate-900 border-2 rounded-lg p-2 flex items-center space-x-2.5 cursor-pointer transition-all shadow-md shrink-0 w-52 ${
          activeTab === "headchef" ? "border-amber-500 ring-2 ring-amber-500/30" : "border-[#d6cbbe] hover:border-amber-400"
        }`}
      >
        <div className="w-10 h-10 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-2xl shadow-inner shrink-0">
          👨‍🍳
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-1.5">
            <span className="font-black text-xs tracking-tight text-slate-900 truncate">HEAD CHEF</span>
            <span className="px-1 bg-amber-400 text-slate-950 font-black text-[8px] rounded uppercase">GOD</span>
            <span className={`px-1 rounded text-[8px] font-bold border ${
              isRoleWorking("headchef") ? "bg-emerald-100 text-emerald-800 border-emerald-400 animate-pulse" : "bg-slate-200 text-slate-600 border-slate-300"
            }`}>
              {isRoleWorking("headchef") ? "working" : "idle"}
            </span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-0.5">
            <span>hive</span>
            <span className="px-1.5 py-0.2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded text-[9px]">
              💬 talk
            </span>
          </div>

          {/* Mini progress bar */}
          <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden mt-1">
            <div className={`h-full ${isRoleWorking("headchef") ? "bg-amber-500 w-3/4 animate-pulse" : "bg-slate-400 w-1/4"}`}></div>
          </div>
        </div>
      </div>

      {/* 2. Station Agent Cards: Line Cook, Plating Chef, Food Inspector, Pantry Scout */}
      {(["linecook", "plating", "inspector", "pantry"] as ChefRole[]).map((role) => {
        const isSelected = activeTab === role;
        const working = isRoleWorking(role);
        const summoned = activeBrigadeChefs.includes(role);
        const subtext = getSubtext(role);

        return (
          <div
            key={role}
            onClick={() => setActiveTab(role)}
            className={`bg-[#fbf8f2] text-slate-900 border-2 rounded-lg p-2 flex items-center space-x-2.5 cursor-pointer transition-all shadow-md shrink-0 w-48 ${
              isSelected ? "border-amber-500 ring-2 ring-amber-500/30" : "border-[#d6cbbe] hover:border-slate-400"
            } ${!summoned ? "opacity-75" : "opacity-100"}`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl shadow-inner shrink-0 ${
              working ? "bg-amber-100 border border-amber-300 ring-2 ring-amber-400/40" : "bg-slate-200 border border-slate-300"
            }`}>
              {CHEF_ICONS[role]}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[11px] text-slate-900 truncate">
                  {CHEF_SHORT_NAMES[role]}
                </span>
                <span className={`px-1 py-0.2 rounded text-[8px] font-bold border ${
                  working
                    ? "bg-amber-300 text-amber-950 border-amber-500 animate-pulse"
                    : summoned
                    ? "bg-slate-200 text-slate-700 border-slate-300"
                    : "bg-slate-100 text-slate-400 border-slate-200"
                }`}>
                  {working ? "working" : summoned ? "awaiting" : "idle"}
                </span>
              </div>

              <div className="text-[10px] text-slate-600 font-mono truncate mt-0.5">
                {subtext}
              </div>

              {/* Mini slider / activity bar */}
              <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden mt-1">
                <div className={`h-full ${
                  working ? "bg-amber-500 w-4/5 animate-pulse" : summoned ? "bg-emerald-400 w-1/2" : "bg-slate-300 w-1/5"
                }`}></div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Quick Master Pass tab pill at the end */}
      <div
        onClick={() => setActiveTab("master")}
        className={`px-3 py-2.5 rounded-lg border-2 cursor-pointer transition-all text-xs font-mono font-bold flex items-center space-x-1.5 shrink-0 ${
          activeTab === "master" ? "bg-amber-500 text-slate-950 border-amber-400 shadow" : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
        }`}
      >
        <span>🌟</span>
        <span>Master Pass</span>
      </div>
    </div>
  );
};
