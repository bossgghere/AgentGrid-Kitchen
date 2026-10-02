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

  const getRoleBubble = (role: ChefRole): { text: string; bg: string } => {
    const isSummoned = activeBrigadeChefs.includes(role);
    const working = isRoleWorking(role);

    if (role === "headchef") {
      if (working) return { text: "orchestrating...", bg: "bg-[#fffdfa]" };
      if (activeBrigadeChefs.length > 0) return { text: "monitoring", bg: "bg-[#fffdfa]" };
      return { text: "idle", bg: "bg-[#fffdfa]" };
    }

    if (!isSummoned) {
      return { text: "awaiting", bg: "bg-[#fffdfa]" };
    }

    if (working) {
      if (role === "linecook") return { text: "cooking code...", bg: "bg-[#fffdfa]" };
      if (role === "plating") return { text: "plating UI...", bg: "bg-[#fffdfa]" };
      if (role === "inspector") return { text: "starting up", bg: "bg-[#fffdfa]" };
      if (role === "pantry") return { text: "starting up", bg: "bg-[#fffdfa]" };
      return { text: "working", bg: "bg-[#fffdfa]" };
    }

    const relatedTicket = tickets.find((t) => t.assignee === role);
    if (relatedTicket?.status === "in_progress") {
      return { text: "starting up", bg: "bg-[#fffdfa]" };
    }
    return { text: "awaiting", bg: "bg-[#fffdfa]" };
  };

  return (
    <div className="flex flex-col h-full bg-[#95aca1] border-2 border-[#2d241d] rounded-sm overflow-hidden shadow-md relative select-none"
         style={{
           backgroundImage: "radial-gradient(#7e968b 1.5px, transparent 1.5px)",
           backgroundSize: "20px 20px",
         }}>
      
      {/* 2D Munder Difflin Office Layout Canvas */}
      <div className="relative w-full h-full p-3 flex flex-col justify-between overflow-hidden">
        
        {/* OUTER WALLS BORDER INSET */}
        <div className="absolute inset-2 border-2 border-[#2d241d] pointer-events-none rounded-sm"></div>

        {/* TOP ROW: Executive Office + Conference Room + Upper Workstations */}
        <div className="grid grid-cols-12 gap-3 h-[42%] z-10 pt-1">
          
          {/* 1. Executive Corner Office (Top Left) */}
          <div
            onClick={() => setActiveTab("headchef")}
            className={`col-span-4 bg-[#fbf9f4] border-2 border-[#2d241d] rounded-sm p-2 flex flex-col justify-between relative cursor-pointer shadow-sm transition-all ${
              activeTab === "headchef" ? "ring-2 ring-[#eab308]" : ""
            }`}
          >
            {/* Top Wall: Clock, Window, Calendar */}
            <div className="flex items-center justify-between border-b border-[#2d241d]/20 pb-1 text-[10px] font-mono">
              <div className="flex items-center space-x-1.5">
                <span title="Clock">⏰</span>
                <span className="w-5 h-3 bg-[#bfdbfe] border border-[#2d241d] inline-block" title="Window"></span>
                <span title="Calendar">📅</span>
              </div>
              <span className="text-[9px] font-bold text-[#5c4a39]">HEAD CHEF</span>
            </div>

            {/* Office Interior: Desk, Chair, Head Chef Character */}
            <div className="flex items-center justify-around py-1 relative">
              {/* Plant */}
              <span className="text-base" title="Office Plant">🪴</span>

              {/* Head Chef Sitting at Desk with Speech Bubble */}
              <div className="flex flex-col items-center relative">
                {/* Speech Bubble */}
                <div className="px-1.5 py-0.2 rounded bg-[#fffdfa] border border-[#2d241d] text-[9px] font-mono font-bold shadow-sm whitespace-nowrap mb-0.5">
                  {getRoleBubble("headchef").text}
                </div>

                {/* Pixel Avatar */}
                <div className={`w-8 h-8 rounded bg-[#f7ecd0] border border-[#2d241d] flex items-center justify-center text-lg shadow-sm ${
                  isRoleWorking("headchef") ? "ring-2 ring-[#eab308] animate-pulse" : ""
                }`}>
                  👨‍💼
                </div>

                {/* Desk Furniture */}
                <div className="w-16 h-7 bg-[#d97706]/30 border border-[#2d241d] rounded-sm flex items-center justify-around mt-0.5 shadow-xs text-[10px]">
                  <span>💻</span>
                  <span>📁</span>
                </div>
              </div>

              {/* Door Opening Marker */}
              <div className="w-1.5 h-6 bg-[#2d241d]/10 border-l border-[#2d241d]"></div>
            </div>

            <div className="text-[8px] font-mono text-[#78614d] flex items-center justify-between pt-0.5 border-t border-[#2d241d]/20">
              <span>Office #01</span>
              <span className="font-bold text-[#b45309]">{isRoleWorking("headchef") ? "● ACTIVE" : "IDLE"}</span>
            </div>
          </div>

          {/* 2. Conference Room (Top Middle) */}
          <div className="col-span-5 bg-[#fbf9f4] border-2 border-[#2d241d] rounded-sm p-2 flex flex-col justify-between shadow-sm">
            {/* Window */}
            <div className="flex items-center justify-between border-b border-[#2d241d]/20 pb-1">
              <div className="flex items-center space-x-1">
                <span className="w-6 h-3 bg-[#bfdbfe] border border-[#2d241d] inline-block"></span>
                <span className="w-6 h-3 bg-[#bfdbfe] border border-[#2d241d] inline-block"></span>
              </div>
              <span className="text-[9px] font-mono font-bold text-[#5c4a39]">CONFERENCE PASS</span>
            </div>

            {/* Long Conference Table with 8 Purple Chairs */}
            <div className="flex items-center justify-center my-1 relative">
              <span className="text-sm mr-2">🪴</span>
              <div className="flex flex-col items-center">
                {/* Top 4 Chairs */}
                <div className="flex space-x-2 text-[10px]">
                  <span>💺</span>
                  <span>💺</span>
                  <span>💺</span>
                  <span>💺</span>
                </div>
                {/* Conference Table */}
                <div className="w-32 h-6 bg-[#b45309]/30 border border-[#2d241d] rounded-sm flex items-center justify-around px-2 text-[10px]">
                  <span>💻</span>
                  <span className="text-[8px] font-mono text-[#5c4a39]">MEETING</span>
                  <span>📄</span>
                </div>
                {/* Bottom 4 Chairs */}
                <div className="flex space-x-2 text-[10px]">
                  <span>💺</span>
                  <span>💺</span>
                  <span>💺</span>
                  <span>💺</span>
                </div>
              </div>
            </div>

            <div className="text-[8px] font-mono text-[#78614d] text-right">
              <span>Capacity: 8 Seats</span>
            </div>
          </div>

          {/* 3. Upper Breakroom & Desks (Top Right) */}
          <div className="col-span-3 flex flex-col justify-between">
            {/* Water cooler & upper pair of desks */}
            <div className="flex items-center justify-between pr-2">
              <span className="text-xl" title="Water Cooler">🚰</span>
              <div className="flex space-x-2">
                <div className="flex flex-col items-center">
                  <div className="w-9 h-5 bg-[#d97706]/30 border border-[#2d241d] rounded-sm flex items-center justify-center text-[10px]">
                    🖥️
                  </div>
                  <span className="text-[9px]">🪑</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-9 h-5 bg-[#d97706]/30 border border-[#2d241d] rounded-sm flex items-center justify-center text-[10px]">
                    🖥️
                  </div>
                  <span className="text-[9px]">🪑</span>
                </div>
              </div>
            </div>

            {/* Upper divider wall with storage cabinets */}
            <div className="w-full bg-[#fbf9f4] border-2 border-[#2d241d] p-1 flex items-center justify-around rounded-sm">
              <div className="flex space-x-1 text-[11px]">
                <span title="File Box">📦</span>
                <span title="Supply Cabinet">🗄️</span>
                <span title="Files">📁</span>
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE DIVIDER & PASSAGEWAY */}
        <div className="grid grid-cols-12 gap-2 my-1 z-10">
          {/* Storage Box Units against wall */}
          <div className="col-span-5 flex items-center space-x-2 pl-4">
            <div className="px-2 py-0.5 bg-[#fbf9f4] border border-[#2d241d] rounded-sm flex items-center space-x-1.5 text-[10px]">
              <span>📦</span>
              <span>🗄️</span>
              <span className="text-[8px] font-mono font-bold text-[#5c4a39]">STORAGE</span>
            </div>
          </div>

          {/* Central Corridor */}
          <div className="col-span-3"></div>

          {/* Kitchen / Breakroom Counter (Right) */}
          <div className="col-span-4 bg-[#fbf9f4] border-2 border-[#2d241d] rounded-sm p-1.5 flex items-center justify-around shadow-xs">
            <span title="Coffee Machine" className="text-sm">☕</span>
            <span title="Sink" className="text-sm">🚰</span>
            <div className="w-6 h-8 bg-[#e2e8f0] border border-[#2d241d] rounded-xs flex items-center justify-center text-[10px]" title="Refrigerator">
              🧊
            </div>
            <span title="Trash Can" className="text-xs">🗑️</span>
          </div>
        </div>

        {/* BOTTOM ROW: Open Office Floor Workstation Cubicles */}
        <div className="grid grid-cols-12 gap-2.5 h-[48%] z-10 pb-1">
          
          {/* Desk 1: Line Cook / Jim (Left Desk) */}
          <div
            onClick={() => setActiveTab("linecook")}
            className={`col-span-3 bg-[#fbf9f4]/80 border border-[#2d241d] rounded-sm p-2 flex flex-col justify-between cursor-pointer transition-all ${
              activeTab === "linecook" ? "ring-2 ring-[#eab308] bg-[#fffdfa]" : "hover:bg-[#fffdfa]"
            }`}
          >
            <div className="flex items-center justify-between text-[8px] font-mono font-bold text-[#5c4a39] border-b border-[#2d241d]/10 pb-0.5">
              <span>LINE COOK</span>
              <span className="text-[#b45309]">#02</span>
            </div>

            <div className="flex flex-col items-center my-1">
              <div className="px-1.5 py-0.2 rounded bg-[#fffdfa] border border-[#2d241d] text-[8px] font-mono font-bold mb-0.5">
                {getRoleBubble("linecook").text}
              </div>
              <div className="w-7 h-7 rounded bg-[#f7ecd0] border border-[#2d241d] flex items-center justify-center text-sm mb-1">
                🧑‍💻
              </div>
              <div className="w-16 h-7 bg-[#d97706]/30 border border-[#2d241d] rounded-sm flex items-center justify-around text-[10px]">
                <span>🖥️</span>
                <span>⌨️</span>
              </div>
            </div>

            <div className="text-[8px] font-mono text-[#78614d] flex items-center justify-between">
              <span>Desk A1</span>
              <span className="font-bold text-[#b45309]">{isRoleWorking("linecook") ? "WORKING" : "READY"}</span>
            </div>
          </div>

          {/* Desk 2: Plating Chef / Pam (Center-Left Desk) */}
          <div
            onClick={() => setActiveTab("plating")}
            className={`col-span-3 bg-[#fbf9f4]/80 border border-[#2d241d] rounded-sm p-2 flex flex-col justify-between cursor-pointer transition-all ${
              activeTab === "plating" ? "ring-2 ring-[#eab308] bg-[#fffdfa]" : "hover:bg-[#fffdfa]"
            }`}
          >
            <div className="flex items-center justify-between text-[8px] font-mono font-bold text-[#5c4a39] border-b border-[#2d241d]/10 pb-0.5">
              <span>PLATING CHEF</span>
              <span className="text-[#b45309]">#03</span>
            </div>

            <div className="flex flex-col items-center my-1">
              <div className="px-1.5 py-0.2 rounded bg-[#fffdfa] border border-[#2d241d] text-[8px] font-mono font-bold mb-0.5">
                {getRoleBubble("plating").text}
              </div>
              <div className="w-7 h-7 rounded bg-[#f7ecd0] border border-[#2d241d] flex items-center justify-center text-sm mb-1">
                👩‍🎨
              </div>
              <div className="w-16 h-7 bg-[#d97706]/30 border border-[#2d241d] rounded-sm flex items-center justify-around text-[10px]">
                <span>🖥️</span>
                <span>🎨</span>
              </div>
            </div>

            <div className="text-[8px] font-mono text-[#78614d] flex items-center justify-between">
              <span>Desk A2</span>
              <span className="font-bold text-[#b45309]">{isRoleWorking("plating") ? "PLATING" : "READY"}</span>
            </div>
          </div>

          {/* Desk 3: Food Inspector / Kevin (Center-Right Desk) */}
          <div
            onClick={() => setActiveTab("inspector")}
            className={`col-span-3 bg-[#fbf9f4]/80 border border-[#2d241d] rounded-sm p-2 flex flex-col justify-between cursor-pointer transition-all ${
              activeTab === "inspector" ? "ring-2 ring-[#eab308] bg-[#fffdfa]" : "hover:bg-[#fffdfa]"
            }`}
          >
            <div className="flex items-center justify-between text-[8px] font-mono font-bold text-[#5c4a39] border-b border-[#2d241d]/10 pb-0.5">
              <span>FOOD INSPECTOR</span>
              <span className="text-[#b45309]">#04</span>
            </div>

            <div className="flex flex-col items-center my-1">
              <div className="px-1.5 py-0.2 rounded bg-[#fffdfa] border border-[#2d241d] text-[8px] font-mono font-bold mb-0.5">
                {getRoleBubble("inspector").text}
              </div>
              <div className="w-7 h-7 rounded bg-[#f7ecd0] border border-[#2d241d] flex items-center justify-center text-sm mb-1">
                🧑‍⚖️
              </div>
              <div className="w-16 h-7 bg-[#d97706]/30 border border-[#2d241d] rounded-sm flex items-center justify-around text-[10px]">
                <span>🖥️</span>
                <span>📋</span>
              </div>
            </div>

            <div className="text-[8px] font-mono text-[#78614d] flex items-center justify-between">
              <span>Desk B1</span>
              <span className="font-bold text-[#b45309]">{isRoleWorking("inspector") ? "INSPECTING" : "READY"}</span>
            </div>
          </div>

          {/* Desk 4: Pantry Scout / Ryan & Stanley (Right Desk) */}
          <div
            onClick={() => setActiveTab("pantry")}
            className={`col-span-3 bg-[#fbf9f4]/80 border border-[#2d241d] rounded-sm p-2 flex flex-col justify-between cursor-pointer transition-all ${
              activeTab === "pantry" ? "ring-2 ring-[#eab308] bg-[#fffdfa]" : "hover:bg-[#fffdfa]"
            }`}
          >
            <div className="flex items-center justify-between text-[8px] font-mono font-bold text-[#5c4a39] border-b border-[#2d241d]/10 pb-0.5">
              <span>PANTRY SCOUT</span>
              <span className="text-[#b45309]">#05</span>
            </div>

            <div className="flex flex-col items-center my-1">
              <div className="px-1.5 py-0.2 rounded bg-[#fffdfa] border border-[#2d241d] text-[8px] font-mono font-bold mb-0.5">
                {getRoleBubble("pantry").text}
              </div>
              <div className="w-7 h-7 rounded bg-[#f7ecd0] border border-[#2d241d] flex items-center justify-center text-sm mb-1">
                🧑‍💼
              </div>
              <div className="w-16 h-7 bg-[#d97706]/30 border border-[#2d241d] rounded-sm flex items-center justify-around text-[10px]">
                <span>🖥️</span>
                <span>📦</span>
              </div>
            </div>

            <div className="text-[8px] font-mono text-[#78614d] flex items-center justify-between">
              <span>Desk B2</span>
              <span className="font-bold text-[#b45309]">{isRoleWorking("pantry") ? "SEARCHING" : "READY"}</span>
            </div>
          </div>
        </div>

        {/* BOTTOM LEFT PILL: Memory • minilm (Matches Reference Image) */}
        <div className="absolute bottom-3 left-4 z-20">
          <div className="px-2 py-0.5 bg-[#fbf9f4] border border-[#2d241d] rounded-full text-[9px] font-mono text-[#2d241d] shadow-xs flex items-center space-x-1">
            <span>🧠</span>
            <span className="font-bold">memory · minilm</span>
          </div>
        </div>

        {/* Potted plants in lower corners */}
        <div className="absolute bottom-3 right-4 z-10 text-base" title="Potted Plant">
          🪴
        </div>
      </div>
    </div>
  );
};
