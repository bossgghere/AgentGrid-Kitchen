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
    chooseDirectoryForProject,
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
          <button
            onClick={() => {
              if (currentProject) chooseDirectoryForProject(currentProject.id);
            }}
            className={`px-2 py-0.5 rounded border transition-all cursor-pointer ${
              currentProject?.path
                ? "bg-[#fffdfa] hover:bg-[#ebdcc0] border-[#2d241d] text-[#2d241d] font-bold shadow-sm"
                : "bg-[#fee2e2] hover:bg-[#fecaca] border-[#dc2626] text-[#b91c1c] font-bold animate-pulse"
            }`}
          >
            {currentProject?.path ? `${currentProject.name} (click to change)` : "📁 Click to Choose Folder"}
          </button>
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

      {/* Initial Workspace Location Selection Modal */}
      {(!currentProject?.path || currentProject.path.trim() === "") && (
        <div className="fixed inset-0 z-50 bg-[#1c1917]/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#fbf9f4] border-3 border-[#2d241d] rounded-md p-6 max-w-md w-full shadow-2xl space-y-4 font-mono text-[#2d241d]">
            <div className="flex items-center space-x-3 border-b-2 border-[#2d241d] pb-3">
              <div className="w-10 h-10 rounded bg-[#eab308] border-2 border-[#2d241d] flex items-center justify-center text-2xl shadow-xs shrink-0">
                👨‍🍳
              </div>
              <div>
                <h2 className="text-base font-black tracking-tight text-[#2d241d]">CHOOSE WORKSPACE LOCATION</h2>
                <p className="text-[11px] text-[#5c4a39]">AgentGrid Kitchen • Real Antigravity CLI</p>
              </div>
            </div>

            <p className="text-xs text-[#4a3b2c] leading-relaxed">
              Select the workspace folder where your project files will be cooked. As soon as you choose your folder, the real <strong>agy</strong> CLI interactive terminal will boot up.
            </p>

            <div className="bg-[#f7ecd0] border border-[#2d241d] rounded p-3 text-xs space-y-1.5">
              <div className="font-bold flex items-center space-x-1.5 text-[#2d241d]">
                <span>⚡</span>
                <span>Immediate Next Steps:</span>
              </div>
              <ul className="list-disc list-inside text-[11px] text-[#5c4a39] space-y-1">
                <li>Spawns real interactive <code>agy</code> session directly in your folder</li>
                <li>Display OAuth login link if authentication is required</li>
                <li>Full normal terminal access + direct typing into the session</li>
                <li>Connects Head Chef QUEUE orders straight to the CLI</li>
              </ul>
            </div>

            <div className="pt-2">
              <button
                onClick={async () => {
                  if (currentProject) {
                    await chooseDirectoryForProject(currentProject.id);
                  }
                }}
                className="w-full py-2.5 bg-[#eab308] hover:bg-[#ca8a04] text-[#18181b] font-black text-xs rounded border-2 border-[#2d241d] shadow transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>📁</span>
                <span>CHOOSE PROJECT DIRECTORY</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
