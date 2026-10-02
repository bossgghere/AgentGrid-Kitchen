import React from "react";
import { useKitchenStore } from "../store/kitchenStore.ts";
import type { ChefRole } from "../../domain/types/hive.types.ts";

interface AgentDeckItem {
  id: string;
  role: ChefRole | "worker" | "content";
  name: string;
  title: string;
  avatar: string;
  isGod?: boolean;
  subtextDefault: string;
}

const AGENT_DECK: AgentDeckItem[] = [
  { id: "michael", role: "headchef", name: "MICHAEL", title: "HEAD CHEF", avatar: "👨‍💼", isGod: true, subtextDefault: "hive" },
  { id: "jim", role: "linecook", name: "JIM", title: "LINE COOK", avatar: "👨‍💻", subtextDefault: "awaiting" },
  { id: "pam", role: "plating", name: "PAM", title: "PLATING", avatar: "👩‍🎨", subtextDefault: "awaiting" },
  { id: "kevin", role: "inspector", name: "KEVIN", title: "INSPECTOR", avatar: "🕵️", subtextDefault: "starting up" },
  { id: "ryan", role: "pantry", name: "RYAN", title: "PANTRY", avatar: "📦", subtextDefault: "starting up" },
  { id: "stanley", role: "worker", name: "STANLEY", title: "QA ENGINE", avatar: "👔", subtextDefault: "starting up" },
  { id: "meredith", role: "content", name: "MEREDITH", title: "CONTENT", avatar: "🍷", subtextDefault: "InstaContent" },
];

export const KitchenBrigadeDeck: React.FC = () => {
  const {
    activeAgents,
    activeBrigadeChefs,
    registry,
    activeTab,
    setActiveTab,
  } = useKitchenStore();

  const isRoleWorking = (role: ChefRole | "worker" | "content") => {
    if (role === "worker" || role === "content") return true;
    return (
      activeAgents.some((a) => a.role === role && a.status === "running") ||
      registry[role]?.status === "working"
    );
  };

  const getSubtext = (item: AgentDeckItem): string => {
    if (item.role === "worker" || item.role === "content") return item.subtextDefault;
    const role = item.role as ChefRole;
    const isSummoned = activeBrigadeChefs.includes(role);
    if (!isSummoned && role !== "headchef") return "standby";
    if (isRoleWorking(role)) {
      if (role === "headchef") return "hive · orchestrating";
      if (role === "linecook") return "cooking code";
      if (role === "plating") return "plating UI";
      if (role === "inspector") return "validating QA";
      if (role === "pantry") return "fetching assets";
      return "working";
    }
    return item.subtextDefault;
  };

  return (
    <div className="bg-[#faefd4] border-2 border-[#2d241d] rounded-md p-2 flex items-center space-x-2 overflow-x-auto select-none shadow-sm">
      {AGENT_DECK.map((agent) => {
        const isChefRole = agent.role !== "worker" && agent.role !== "content";
        const roleKey = isChefRole ? (agent.role as ChefRole) : "headchef";
        const isSelected = activeTab === roleKey && isChefRole;
        const working = isRoleWorking(agent.role);
        const subtext = getSubtext(agent);

        return (
          <div
            key={agent.id}
            onClick={() => {
              if (isChefRole) setActiveTab(roleKey);
            }}
            className={`bg-[#fbf9f4] text-[#2d241d] border-2 rounded p-2 flex items-center space-x-2.5 cursor-pointer transition-all shrink-0 w-48 hover:shadow-md ${
              isSelected
                ? "border-[#2d241d] ring-2 ring-[#eab308] bg-[#fffefc]"
                : "border-[#4a3e31]/60 hover:border-[#2d241d]"
            }`}
          >
            {/* Pixel Character Avatar Box */}
            <div className="w-10 h-10 rounded border-2 border-[#2d241d] bg-[#f0e4cc] flex items-center justify-center text-xl shadow-inner shrink-0">
              {agent.avatar}
            </div>

            {/* Agent Info & Controls */}
            <div className="flex-1 min-w-0">
              {/* Header: Name, GOD badge, Status pill */}
              <div className="flex items-center space-x-1.5">
                <span className="font-black text-[11px] tracking-tight text-[#2d241d] truncate">
                  {agent.name}
                </span>
                {agent.isGod && (
                  <span className="px-1 bg-[#eab308] text-[#1c1917] font-black text-[8px] rounded-xs border border-[#2d241d] leading-tight">
                    GOD
                  </span>
                )}
                <span
                  className={`ml-auto px-1 py-0.5 rounded text-[8px] font-bold border flex items-center space-x-0.5 ${
                    working
                      ? "bg-[#fef08a] text-[#854d0e] border-[#ca8a04]"
                      : "bg-[#e5e5e5] text-[#525252] border-[#a3a3a3]"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full inline-block ${working ? "bg-[#eab308]" : "bg-gray-400"}`} />
                  <span>{working ? "working" : "idle"}</span>
                </span>
              </div>

              {/* Subtitle / Action Row */}
              <div className="flex items-center justify-between text-[10px] text-[#5c5043] font-mono mt-0.5">
                <span className="truncate">{subtext}</span>
                {agent.isGod && (
                  <button className="px-1.5 py-0.2 bg-[#fffdfa] hover:bg-[#ebdcc0] text-[#2d241d] border border-[#2d241d] font-bold rounded text-[8px] shadow-2xs">
                    🎙 talk
                  </button>
                )}
              </div>

              {/* Bottom Track / Slider Progress */}
              <div className="w-full bg-[#dfd4be] h-1.5 rounded-full mt-1.5 relative overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    working ? "bg-[#eab308] w-3/4" : "bg-[#a89d89] w-1/4"
                  }`}
                />
              </div>
            </div>
          </div>
        );
      })}

      {/* Quick Master Pass tab pill */}
      <div
        onClick={() => setActiveTab("master")}
        className={`px-3 py-3 rounded border-2 cursor-pointer transition-all text-xs font-mono font-bold flex items-center space-x-1.5 shrink-0 ${
          activeTab === "master"
            ? "bg-[#eab308] text-[#1c1917] border-[#2d241d] shadow"
            : "bg-[#fbf9f4] text-[#2d241d] border-[#4a3e31]/60 hover:border-[#2d241d]"
        }`}
      >
        <span>🌟</span>
        <span>MASTER PASS</span>
      </div>
    </div>
  );
};

