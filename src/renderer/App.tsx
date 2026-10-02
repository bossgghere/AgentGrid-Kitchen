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
    // Initial fetch
    fetchRegistry();
    fetchTickets();
    fetchActiveAgents();

    if (typeof window !== "undefined" && window.agentgrid) {
      // Subscribe to real-time IPC event streams
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
    <div className="flex flex-col h-screen w-screen bg-[#0b1019] text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Application Header Bar (Retro Munder Difflin Style) */}
      <header className="flex items-center justify-between px-3 py-1.5 bg-[#0f172a] border-b-2 border-[#334155] shadow-md z-10 shrink-0">
        <div className="flex items-center space-x-3">
          {/* Window control simulation dots */}
          <div className="flex items-center space-x-1.5 pr-2">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block shadow-sm"></span>
            <span className="w-3 h-3 rounded-full bg-amber-400 inline-block shadow-sm"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shadow-sm"></span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xl">👨‍🍳</span>
            <span className="font-black text-sm tracking-wide text-amber-400 font-mono">AGENTGRID KITCHEN</span>
            <span className="px-1.5 py-0.2 bg-slate-800 text-slate-400 text-[10px] font-mono rounded border border-slate-700">v1.0.0</span>
            <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
              ● auto mode on
            </span>
          </div>
        </div>

        {/* Center Workspace Project Display */}
        <div className="hidden md:flex items-center space-x-2 text-xs font-mono text-slate-400">
          <span>📁 Workspace:</span>
          <span className={`px-2 py-0.5 rounded font-bold ${
            currentProject?.path ? "text-amber-300 bg-slate-900 border border-slate-800" : "text-rose-400 bg-rose-950/60 border border-rose-900 animate-pulse"
          }`}>
            {currentProject?.path ? currentProject.name : "No folder chosen"}
          </span>
        </div>

        {/* Right Socket Status */}
        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="flex items-center space-x-1.5 bg-[#141c28] px-2.5 py-1 rounded border border-slate-700">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300 text-[11px]">Engine Socket: /tmp/ag.sock</span>
          </div>
        </div>
      </header>

      {/* Main Center Area: 2D Floor Plan (Left 62%) + Command Center (Right 38%) */}
      <main className="flex-1 grid grid-cols-12 gap-2.5 p-2.5 overflow-hidden">
        {/* Left: 2D Kitchen Floor Plan */}
        <section className="col-span-7 h-full overflow-hidden">
          <KitchenFloorCanvas />
        </section>

        {/* Right: Command Center (Terminal, Tasks, Chat & Input Queue) */}
        <section className="col-span-5 h-full overflow-hidden">
          <CommandCenter />
        </section>
      </main>

      {/* Bottom Horizontal Station Agent Cards Deck */}
      <footer className="shrink-0 z-10">
        <KitchenBrigadeDeck />
      </footer>
    </div>
  );
};

export default App;
