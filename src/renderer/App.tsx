import React, { useEffect } from "react";
import { useKitchenStore } from "./store/kitchenStore.ts";
import { KitchenPass } from "./components/KitchenPass.tsx";
import { ChefChatPanel } from "./components/ChefChatPanel.tsx";
import { KitchenRoster } from "./components/KitchenRoster.tsx";

export const App: React.FC = () => {
  const {
    fetchRegistry,
    fetchTickets,
    fetchActiveAgents,
    handlePtyData,
    handleStatusChange,
    handleMessageDelivered,
    handleHookReceived,
    messages,
  } = useKitchenStore();

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
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Header Bar */}
      <header className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 shadow-md">
        <div className="flex items-center space-x-3">
          <span className="text-xl">👨‍🍳</span>
          <div>
            <h1 className="text-sm font-extrabold tracking-wide text-amber-400">AGENTGRID KITCHEN</h1>
            <p className="text-[10px] text-slate-400 font-mono">Executive Chef Control Deck • Michelin Multi-Agent Suite</p>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-xs font-mono">
          <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-300">Engine Socket: /tmp/ag.sock</span>
          </div>
        </div>
      </header>

      {/* Main Workspace: Kitchen Pass Terminal (8 cols) + Chef Chat Panel (4 cols) */}
      <main className="flex-1 grid grid-cols-12 gap-3 px-3 pt-3 pb-1.5 overflow-hidden">
        {/* Left Column: Kitchen Pass Terminal (8 cols) */}
        <div className="col-span-8 h-full overflow-hidden">
          <KitchenPass />
        </div>

        {/* Right Column: Chef Chat Panel & Dispatches (4 cols) */}
        <div className="col-span-4 flex flex-col h-full space-y-2 overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <ChefChatPanel />
          </div>

          {/* Compact Service Bell Dispatches (h-28) */}
          <div className="h-28 bg-slate-900 border border-slate-800 rounded-lg p-2 flex flex-col overflow-hidden shrink-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[11px] font-bold text-slate-200">🔔 Service Bell Dispatches</h3>
              <span className="text-[9px] text-slate-500 font-mono">Hive Router</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 text-[9px]">
              {messages.length === 0 ? (
                <div className="text-slate-500 italic text-[10px]">No dispatches delivered yet.</div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className="bg-slate-950 p-1 rounded border border-slate-800 flex items-center justify-between">
                    <div className="truncate">
                      <span className="text-amber-400 font-bold">{m.from}</span>
                      <span className="text-slate-400"> ──► </span>
                      <span className="text-emerald-400 font-bold">{m.to}: </span>
                      <span className="text-slate-300">{m.subject}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Long Horizontal Section: Kitchen Brigade Roster */}
      <section className="px-3 pb-3 pt-1 shrink-0">
        <KitchenRoster />
      </section>
    </div>
  );
};

export default App;
