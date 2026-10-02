import React, { useEffect } from "react";
import { useKitchenStore } from "./store/kitchenStore.ts";
import { KitchenFloorCanvas } from "./components/KitchenFloorCanvas.tsx";
import { CommandCenter } from "./components/CommandCenter.tsx";
import { KitchenBrigadeDeck } from "./components/KitchenBrigadeDeck.tsx";

export const App: React.FC = () => {
  const {
    fetchRegistry,
    fetchTickets,
    fetchActiveAgents,
    handlePtyData,
    handleStatusChange,
    handleMessageDelivered,
    handleHookReceived,
    projects,
    activeProjectId,
  } = useKitchenStore();

  const currentProject = projects.find((p) => p.id === activeProjectId) || projects[0];

  useEffect(() => {
    fetchRegistry();
    fetchTickets();
    fetchActiveAgents();

    if (typeof window !== "undefined" && window.agentgrid) {
      const unbindPty = window.agentgrid.onPtyData(handlePtyData);
      const unbindStatus = window.agentgrid.onStatusChanged(handleStatusChange);
      const unbindMsg = window.agentgrid.onMessageDelivered(handleMessageDelivered);
      const unbindHook = window.agentgrid.onHookReceived(handleHookReceived);

      return () => {
        unbindPty();
        unbindStatus();
        unbindMsg();
        unbindHook();
      };
    }
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#f7ecd0] text-[#2d241d] font-sans select-none overflow-hidden border-2 border-[#2d241d]">
      {/* Top Application Header Bar (Exact Munder Difflin Style) */}
      <header className="flex items-center justify-between px-3 py-1.5 bg-[#f7ecd0] border-b-2 border-[#2d241d] z-10 shrink-0 font-mono text-xs">
        <div className="flex items-center space-x-3">
          {/* Mac Traffic Lights */}
          <div className="flex items-center space-x-1.5 pr-1">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#d63f37] inline-block shadow-sm cursor-pointer"></span>
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#d69e26] inline-block shadow-sm cursor-pointer"></span>
            <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1fa833] inline-block shadow-sm cursor-pointer"></span>
          </div>

          {/* Red Munder Difflin / AgentGrid Pixel Logo Badge */}
          <div className="flex items-center space-x-2">
            <div className="px-1.5 py-0.5 bg-[#801818] border border-[#4a0d0d] text-[#f7ecd0] font-black text-[9px] tracking-tighter rounded-sm shadow-sm leading-tight text-center">
              AGENT<br />GRID
            </div>
            <span className="text-[11px] font-bold text-[#4a3b2c]">v0.3.9</span>
            <span className="text-[11px] font-bold text-[#2d241d] ml-1">auto mode on</span>
          </div>
        </div>

        {/* Center Workspace Folder Bar */}
        <div className="hidden md:flex items-center space-x-2 text-[11px] font-mono text-[#5a4836]">
          <span>📁 Workspace:</span>
          <span className={`px-2 py-0.5 rounded border ${
            currentProject?.path
              ? "bg-[#fffdfa] border-[#2d241d] text-[#2d241d] font-bold shadow-sm"
              : "bg-[#fee2e2] border-[#dc2626] text-[#b91c1c] font-bold animate-pulse"
          }`}>
            {currentProject?.path ? currentProject.name : "Choose folder below"}
          </span>
        </div>

        {/* Right Window Controls (Moon, Maximize, Close) */}
        <div className="flex items-center space-x-2 text-xs">
          <button className="w-6 h-6 flex items-center justify-center rounded border border-[#2d241d] bg-[#fffdfa] hover:bg-[#ebdcc0] shadow-sm text-xs" title="Dark / Light Mode">
            🌙
          </button>
          <button className="w-6 h-6 flex items-center justify-center rounded border border-[#2d241d] bg-[#fffdfa] hover:bg-[#ebdcc0] shadow-sm text-[10px] font-bold" title="Fullscreen">
            ⛶
          </button>
          <button className="w-6 h-6 flex items-center justify-center rounded border border-[#2d241d] bg-[#fffdfa] hover:bg-[#ebdcc0] shadow-sm text-xs font-bold" title="Settings">
            ⚙
          </button>
        </div>
      </header>

      {/* Main Center Area: 2D Floor Plan (Left ~63%) + Command Center (Right ~37%) */}
      <main className="flex-1 grid grid-cols-12 gap-2.5 p-2.5 overflow-hidden">
        {/* Left: 2D Pixel Art Office/Kitchen Floor */}
        <section className="col-span-7 xl:col-span-7 h-full overflow-hidden">
          <KitchenFloorCanvas />
        </section>

        {/* Right: Command Center (Terminal, Tasks, Chat & Input Queue) */}
        <section className="col-span-5 xl:col-span-5 h-full overflow-hidden">
          <CommandCenter />
        </section>
      </main>

      {/* Bottom Horizontal Station Agent Cards Deck */}
      <footer className="shrink-0 z-10 px-2.5 pb-2.5">
        <KitchenBrigadeDeck />
      </footer>
    </div>
  );
};

export default App;
