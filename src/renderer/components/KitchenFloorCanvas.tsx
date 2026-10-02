import React from "react";
import { useKitchenStore } from "../store/kitchenStore.ts";
import type { ChefRole } from "../../domain/types/hive.types.ts";

export const KitchenFloorCanvas: React.FC = () => {
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

  const getRoleBubble = (role: ChefRole): { text: string; color: string } => {
    const isSummoned = activeBrigadeChefs.includes(role);
    const working = isRoleWorking(role);

    if (role === "headchef") {
      if (working) return { text: "orchestrating...", color: "bg-amber-200 text-amber-950 border-amber-400 animate-pulse" };
      if (activeBrigadeChefs.length > 0) return { text: "monitoring floor", color: "bg-amber-100 text-amber-900 border-amber-300" };
      return { text: "idle", color: "bg-slate-200 text-slate-800 border-slate-300" };
    }

    if (!isSummoned) {
      return { text: "off duty", color: "bg-slate-800/80 text-slate-400 border-slate-700" };
    }

    if (working) {
      if (role === "linecook") return { text: "cooking code...", color: "bg-sky-200 text-sky-950 border-sky-400 animate-pulse" };
      if (role === "plating") return { text: "plating UI...", color: "bg-emerald-200 text-emerald-950 border-emerald-400 animate-pulse" };
      if (role === "inspector") return { text: "QA inspecting...", color: "bg-purple-200 text-purple-950 border-purple-400 animate-pulse" };
      if (role === "pantry") return { text: "researching...", color: "bg-amber-200 text-amber-950 border-amber-400 animate-pulse" };
      return { text: "working", color: "bg-amber-200 text-amber-950 border-amber-400" };
    }

    // Finished or awaiting
    const relatedTicket = tickets.find((t) => t.assignee === role);
    if (relatedTicket?.status === "in_progress") {
      return { text: "starting up", color: "bg-blue-100 text-blue-900 border-blue-300" };
    }
    return { text: "awaiting", color: "bg-slate-100 text-slate-800 border-slate-300" };
  };

  return (
    <div className="flex flex-col h-full bg-[#1b2230] border-2 border-[#334155] rounded-xl overflow-hidden shadow-2xl relative select-none">
      {/* Floor Room Header Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0f172a] border-b border-[#334155] text-xs font-mono">
        <div className="flex items-center space-x-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-bold text-amber-300 tracking-wide">MICHELIN KITCHEN FLOOR</span>
          <span className="text-slate-400">• Autonomous Brigade Grid</span>
        </div>
        <div className="flex items-center space-x-3 text-[11px] text-slate-300">
          <span>⏰ 18:50</span>
          <span>🌡️ 450°F Stove</span>
          <span className="bg-[#1e293b] px-2 py-0.5 rounded border border-slate-700 text-amber-400 font-bold">
            {activeBrigadeChefs.length > 0 ? `${activeBrigadeChefs.length} Active Chefs` : "Kitchen Standby"}
          </span>
        </div>
      </div>

      {/* 2D Kitchen Top-Down Isometric Canvas */}
      <div className="flex-1 p-4 bg-[#141c28] relative overflow-hidden flex flex-col justify-between"
           style={{
             backgroundImage: "radial-gradient(#273549 1px, transparent 1px), radial-gradient(#273549 1px, #141c28 1px)",
             backgroundSize: "24px 24px",
             backgroundPosition: "0 0, 12px 12px"
           }}>

        {/* TOP ROW: Head Chef's Executive Office & Conference Pass */}
        <div className="grid grid-cols-12 gap-4 h-[42%]">
          {/* Head Chef's Private Command Office (Top Left) */}
          <div
            onClick={() => setActiveTab("headchef")}
            className={`col-span-5 bg-[#1e293b]/90 border-2 rounded-xl p-3 relative cursor-pointer transition-all shadow-lg flex flex-col justify-between ${
              activeTab === "headchef" ? "border-amber-400 ring-2 ring-amber-400/20" : "border-slate-700 hover:border-slate-500"
            }`}
          >
            {/* Office Wall Sign */}
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-1 text-[11px] font-mono">
              <span className="font-extrabold text-amber-400">👑 EXECUTIVE CHEF OFFICE</span>
              <span className="text-[10px] text-slate-400">Station #01</span>
            </div>

            {/* Office Interior */}
            <div className="flex items-center justify-around py-1 relative">
              {/* Desk with laptop and bell */}
              <div className="w-24 h-16 bg-[#334155] border-2 border-slate-600 rounded-lg flex flex-col items-center justify-center relative shadow-md">
                <span className="text-sm">💻</span>
                <span className="text-[9px] font-mono text-slate-300">HivePass</span>
                {/* Desk golden bell */}
                <span className="absolute -top-2 -right-2 text-xs" title="Order Bell">🛎️</span>
              </div>

              {/* Head Chef Character Avatar with Floating Speech Bubble */}
              <div className="flex flex-col items-center relative">
                {/* Speech Bubble */}
                <div className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border shadow-md whitespace-nowrap mb-1 transition-all ${getRoleBubble("headchef").color}`}>
                  {getRoleBubble("headchef").text}
                </div>

                {/* Character */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-lg border-2 ${
                  isRoleWorking("headchef") ? "bg-amber-500/20 border-amber-400 ring-4 ring-amber-400/30" : "bg-slate-800 border-slate-600"
                }`}>
                  👨‍🍳
                </div>
                <span className="text-[10px] font-bold text-slate-200 mt-1">Head Chef</span>
              </div>

              {/* Office Decor: Potted plant & Wall Clock */}
              <div className="flex flex-col space-y-2 text-base">
                <span title="Fiddle Leaf Fig">🪴</span>
                <span title="Kitchen Clock">⏰</span>
              </div>
            </div>

            {/* Subtext */}
            <div className="text-[9px] font-mono text-slate-400 flex items-center justify-between pt-1 border-t border-slate-700/60">
              <span>Pass Protocol: PTY Node</span>
              <span className="text-amber-400 font-bold">{isRoleWorking("headchef") ? "ACTIVE" : "STANDBY"}</span>
            </div>
          </div>

          {/* Central Conference Pass / Kitchen Pass Counter (Top Right) */}
          <div className="col-span-7 bg-[#1e293b]/70 border-2 border-slate-700/80 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-1 text-[11px] font-mono">
              <span className="font-extrabold text-slate-300">🍽️ KITCHEN PASS & EXPEDITION COUNTER</span>
              <span className="text-emerald-400 font-bold">READY TO SERVE</span>
            </div>

            {/* Long Stainless Steel Pass Table */}
            <div className="flex-1 my-2 bg-[#334155]/60 border-2 border-dashed border-slate-600 rounded-lg p-2 flex items-center justify-around relative">
              <div className="flex items-center space-x-2 text-slate-300">
                <span className="text-2xl">📋</span>
                <div className="text-[10px] font-mono">
                  <div className="text-amber-400 font-bold">Master Order Ticket</div>
                  <div className="text-slate-400">{tickets[0]?.title ? tickets[0].title.slice(0, 32) + "..." : "No active order"}</div>
                </div>
              </div>

              <div className="h-8 w-[1px] bg-slate-600"></div>

              {/* Plated Dishes on the Counter */}
              <div className="flex items-center space-x-3 text-2xl">
                <div className="relative" title="Hot Entree">
                  <span>🍲</span>
                  {activeBrigadeChefs.length > 0 && <span className="absolute -top-1 -right-1 text-[8px] bg-emerald-500 rounded-full h-2 w-2 animate-ping"></span>}
                </div>
                <div title="Plated Appetizer">🥗</div>
                <div title="Artisan Dessert">🍰</div>
              </div>

              <div className="h-8 w-[1px] bg-slate-600"></div>

              {/* Service Bell & Telemetry */}
              <div className="text-center font-mono text-[9px]">
                <div className="text-2xl">🛎️</div>
                <div className="text-amber-400 font-bold">Service Bell</div>
              </div>
            </div>

            <div className="text-[9px] font-mono text-slate-400 flex items-center justify-between">
              <span>Directives Dispatched: {tickets.length}</span>
              <span className="text-slate-400">Hive Router: <span className="text-emerald-400">Polling (200ms)</span></span>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW: The 4 Station Chef Desks / Workstations */}
        <div className="grid grid-cols-4 gap-3 h-[52%]">
          {/* 1. Line Cook Station (Hot Stove) */}
          <div
            onClick={() => setActiveTab("linecook")}
            className={`bg-[#1e293b]/90 border-2 rounded-xl p-2.5 flex flex-col justify-between cursor-pointer transition-all ${
              activeTab === "linecook" ? "border-sky-400 ring-2 ring-sky-400/20" : "border-slate-700 hover:border-slate-500"
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-mono border-b border-slate-700/60 pb-1">
              <span className="font-extrabold text-sky-400">🍳 LINE COOK</span>
              <span className="text-[9px] text-slate-400">Stove #02</span>
            </div>

            <div className="flex flex-col items-center justify-center my-1 relative">
              {/* Floating Speech Bubble */}
              <div className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border shadow-sm mb-1.5 transition-all ${getRoleBubble("linecook").color}`}>
                {getRoleBubble("linecook").text}
              </div>

              {/* Avatar */}
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl shadow-md border-2 ${
                isRoleWorking("linecook") ? "bg-sky-500/20 border-sky-400 ring-4 ring-sky-400/30 animate-pulse" : "bg-slate-800 border-slate-600"
              }`}>
                🍳
              </div>

              {/* Work Desk Furniture: Burners & Pans */}
              <div className="mt-1.5 px-3 py-1 bg-[#334155] border border-slate-600 rounded text-xs flex space-x-2">
                <span title="Gas Burner">🔥</span>
                <span title="Saute Pan">🥘</span>
                <span title="Knife Block">🔪</span>
              </div>
            </div>

            <div className="text-[9px] font-mono text-slate-400 flex items-center justify-between border-t border-slate-700/60 pt-1">
              <span>Full-Stack Coder</span>
              <span className={isRoleWorking("linecook") ? "text-sky-400 font-bold" : "text-slate-500"}>
                {isRoleWorking("linecook") ? "COOKING" : "IDLE"}
              </span>
            </div>
          </div>

          {/* 2. Plating Chef Station (Pastry & Design) */}
          <div
            onClick={() => setActiveTab("plating")}
            className={`bg-[#1e293b]/90 border-2 rounded-xl p-2.5 flex flex-col justify-between cursor-pointer transition-all ${
              activeTab === "plating" ? "border-emerald-400 ring-2 ring-emerald-400/20" : "border-slate-700 hover:border-slate-500"
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-mono border-b border-slate-700/60 pb-1">
              <span className="font-extrabold text-emerald-400">🎨 PLATING CHEF</span>
              <span className="text-[9px] text-slate-400">Table #03</span>
            </div>

            <div className="flex flex-col items-center justify-center my-1 relative">
              {/* Floating Speech Bubble */}
              <div className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border shadow-sm mb-1.5 transition-all ${getRoleBubble("plating").color}`}>
                {getRoleBubble("plating").text}
              </div>

              {/* Avatar */}
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl shadow-md border-2 ${
                isRoleWorking("plating") ? "bg-emerald-500/20 border-emerald-400 ring-4 ring-emerald-400/30 animate-pulse" : "bg-slate-800 border-slate-600"
              }`}>
                🎨
              </div>

              {/* Work Desk Furniture: Plating Table & Squeeze Bottles */}
              <div className="mt-1.5 px-3 py-1 bg-[#334155] border border-slate-600 rounded text-xs flex space-x-2">
                <span title="Color Palette">🖌️</span>
                <span title="Garnish Dish">🍽️</span>
                <span title="Sauce Drizzler">✨</span>
              </div>
            </div>

            <div className="text-[9px] font-mono text-slate-400 flex items-center justify-between border-t border-slate-700/60 pt-1">
              <span>UI/UX Designer</span>
              <span className={isRoleWorking("plating") ? "text-emerald-400 font-bold" : "text-slate-500"}>
                {isRoleWorking("plating") ? "PLATING" : "IDLE"}
              </span>
            </div>
          </div>

          {/* 3. Food Inspector Station (QA Inspection Bench) */}
          <div
            onClick={() => setActiveTab("inspector")}
            className={`bg-[#1e293b]/90 border-2 rounded-xl p-2.5 flex flex-col justify-between cursor-pointer transition-all ${
              activeTab === "inspector" ? "border-purple-400 ring-2 ring-purple-400/20" : "border-slate-700 hover:border-slate-500"
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-mono border-b border-slate-700/60 pb-1">
              <span className="font-extrabold text-purple-400">🔍 FOOD INSPECTOR</span>
              <span className="text-[9px] text-slate-400">Bench #04</span>
            </div>

            <div className="flex flex-col items-center justify-center my-1 relative">
              {/* Floating Speech Bubble */}
              <div className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border shadow-sm mb-1.5 transition-all ${getRoleBubble("inspector").color}`}>
                {getRoleBubble("inspector").text}
              </div>

              {/* Avatar */}
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl shadow-md border-2 ${
                isRoleWorking("inspector") ? "bg-purple-500/20 border-purple-400 ring-4 ring-purple-400/30 animate-pulse" : "bg-slate-800 border-slate-600"
              }`}>
                🔍
              </div>

              {/* Work Desk Furniture: QA Bench, Thermometer & Checklist */}
              <div className="mt-1.5 px-3 py-1 bg-[#334155] border border-slate-600 rounded text-xs flex space-x-2">
                <span title="QA Checklist">📝</span>
                <span title="Food Thermometer">🌡️</span>
                <span title="Test Bench">🔬</span>
              </div>
            </div>

            <div className="text-[9px] font-mono text-slate-400 flex items-center justify-between border-t border-slate-700/60 pt-1">
              <span>QA & Reviewer</span>
              <span className={isRoleWorking("inspector") ? "text-purple-400 font-bold" : "text-slate-500"}>
                {isRoleWorking("inspector") ? "INSPECTING" : "IDLE"}
              </span>
            </div>
          </div>

          {/* 4. Pantry Scout Station (Research & Walk-in Storage) */}
          <div
            onClick={() => setActiveTab("pantry")}
            className={`bg-[#1e293b]/90 border-2 rounded-xl p-2.5 flex flex-col justify-between cursor-pointer transition-all ${
              activeTab === "pantry" ? "border-amber-400 ring-2 ring-amber-400/20" : "border-slate-700 hover:border-slate-500"
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-mono border-b border-slate-700/60 pb-1">
              <span className="font-extrabold text-amber-300">📦 PANTRY SCOUT</span>
              <span className="text-[9px] text-slate-400">Vault #05</span>
            </div>

            <div className="flex flex-col items-center justify-center my-1 relative">
              {/* Floating Speech Bubble */}
              <div className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border shadow-sm mb-1.5 transition-all ${getRoleBubble("pantry").color}`}>
                {getRoleBubble("pantry").text}
              </div>

              {/* Avatar */}
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl shadow-md border-2 ${
                isRoleWorking("pantry") ? "bg-amber-500/20 border-amber-400 ring-4 ring-amber-400/30 animate-pulse" : "bg-slate-800 border-slate-600"
              }`}>
                📦
              </div>

              {/* Work Desk Furniture: Pantry Shelves & Crates */}
              <div className="mt-1.5 px-3 py-1 bg-[#334155] border border-slate-600 rounded text-xs flex space-x-2">
                <span title="Spice Shelf">🧂</span>
                <span title="Cold Storage">🧊</span>
                <span title="Ingredient Box">📦</span>
              </div>
            </div>

            <div className="text-[9px] font-mono text-slate-400 flex items-center justify-between border-t border-slate-700/60 pt-1">
              <span>Researcher</span>
              <span className={isRoleWorking("pantry") ? "text-amber-400 font-bold" : "text-slate-500"}>
                {isRoleWorking("pantry") ? "RESEARCH" : "IDLE"}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
