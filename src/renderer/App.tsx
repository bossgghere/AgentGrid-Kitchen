import React, { useEffect } from "react";
import { useKitchenStore } from "./store/kitchenStore.ts";
import { KitchenPass } from "./components/KitchenPass.tsx";
import { OrderTicketBoard } from "./components/OrderTicketBoard.tsx";
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
      <header className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 shadow-md">
        <div className="flex items-center space-x-3">
          <span className="text-xl">👨‍🍳</span>
          <div>
            <h1 className="text-sm font-extrabold tracking-wide text-amber-400">AGENTGRID KITCHEN</h1>
            <p className="text-[10px] text-slate-400 font-mono">Executive Chef Control Deck • Michelin v1.0</p>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-xs font-mono">
          <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-300">Engine Socket: /tmp/ag.sock</span>
          </div>
        </div>
      </header>

      {/* Main 3-Column Dashboard Body */}
      <main className="flex-1 grid grid-cols-12 gap-3 p-3 overflow-hidden">
        {/* Left Column: Kitchen Roster (3 cols) */}
        <div className="col-span-3 h-full overflow-hidden">
          <KitchenRoster />
        </div>

        {/* Center Column: Kitchen Pass Terminal (6 cols) */}
        <div className="col-span-6 h-full overflow-hidden">
          <KitchenPass />
        </div>

        {/* Right Column: Order Ticket Board & Inbox (3 cols) */}
        <div className="col-span-3 flex flex-col h-full space-y-3 overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <OrderTicketBoard />
          </div>

          {/* Comms Inbox */}
          <div className="h-40 bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col overflow-hidden">
            <h3 className="text-xs font-bold text-slate-200 mb-1">🔔 Service Bell Dispatches</h3>
            <div className="flex-1 overflow-y-auto space-y-1.5 text-[10px]">
              {messages.length === 0 ? (
                <div className="text-slate-500 italic">No dispatches delivered yet.</div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className="bg-slate-950 p-1.5 rounded border border-slate-800">
                    <span className="text-amber-400 font-bold">{m.from}</span>
                    <span className="text-slate-400"> ──► </span>
                    <span className="text-emerald-400 font-bold">{m.to}</span>
                    <div className="text-slate-300 truncate">{m.subject}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
