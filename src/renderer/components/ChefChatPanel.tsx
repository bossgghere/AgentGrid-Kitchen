import React, { useState, useRef, useEffect } from "react";
import { useKitchenStore } from "../store/kitchenStore.ts";

export const ChefChatPanel: React.FC = () => {
  const {
    projects,
    activeProjectId,
    selectProject,
    addProject,
    chooseDirectoryForProject,
    chatMessages,
    sendChatMessage,
  } = useKitchenStore();

  const [inputMessage, setInputMessage] = useState("");
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    if (!activeProject?.path || activeProject.path.trim() === "") {
      const chosen = await chooseDirectoryForProject(activeProject?.id || "proj-default");
      if (!chosen) {
        return; // User cancelled
      }
    }

    const msg = inputMessage;
    setInputMessage("");
    await sendChatMessage(msg);
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    addProject(newProjectName.trim());
    setNewProjectName("");
    setIsAddingProject(false);
  };

  const handleChooseFolder = async () => {
    if (activeProject) {
      await chooseDirectoryForProject(activeProject.id);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xl">
      {/* 1. Project Management Bar */}
      <div className="bg-slate-950 p-2.5 border-b border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 overflow-x-auto">
            {projects.map((proj) => {
              const isSelected = proj.id === activeProjectId;
              return (
                <button
                  key={proj.id}
                  onClick={() => selectProject(proj.id)}
                  className={`px-2.5 py-1 text-xs font-bold rounded transition-all whitespace-nowrap ${
                    isSelected
                      ? "bg-amber-500 text-slate-950 shadow-sm"
                      : "bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  📁 {proj.name}
                </button>
              );
            })}

            <button
              onClick={() => setIsAddingProject(true)}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-amber-400 text-xs font-bold rounded border border-slate-800 transition-colors"
              title="Add New Project"
            >
              +
            </button>
          </div>
        </div>

        {/* New Project Input Modal/Inline Form */}
        {isAddingProject && (
          <form onSubmit={handleCreateProject} className="flex items-center space-x-1.5 pt-1">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Project Name (e.g. Storefront)"
              autoFocus
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              className="px-2 py-0.5 bg-emerald-600 text-white font-bold text-xs rounded"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setIsAddingProject(false)}
              className="px-2 py-0.5 bg-slate-800 text-slate-400 text-xs rounded"
            >
              ✕
            </button>
          </form>
        )}

        {/* Working Directory Selector */}
        <div className={`flex items-center justify-between px-2.5 py-1.5 rounded border text-[11px] transition-all ${
          activeProject?.path
            ? "bg-slate-900/80 border-slate-800"
            : "bg-amber-950/70 border-amber-600/80 animate-pulse"
        }`}>
          <div className="flex items-center space-x-1.5 min-w-0 pr-2">
            <span className="text-amber-400 shrink-0">📂</span>
            <span
              className={`font-mono truncate ${activeProject?.path ? "text-slate-300" : "text-amber-300 font-bold"}`}
              title={activeProject?.path || "No folder selected"}
            >
              {activeProject?.path || "⚠️ No workspace folder chosen"}
            </span>
          </div>
          <button
            onClick={handleChooseFolder}
            className={`px-2.5 py-1 text-[10px] font-bold rounded transition-all shrink-0 ${
              activeProject?.path
                ? "bg-slate-800 hover:bg-slate-700 text-amber-400"
                : "bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold shadow"
            }`}
          >
            {activeProject?.path ? "Change" : "📁 Choose Folder"}
          </button>
        </div>
      </div>

      {/* Workspace Selection Banner if no folder chosen */}
      {!activeProject?.path && (
        <div className="mx-3 mt-3 p-3 bg-gradient-to-r from-amber-950/80 to-slate-900 border border-amber-600/80 rounded-lg shadow-lg flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className="text-2xl">📂</span>
            <div>
              <h4 className="text-xs font-extrabold text-amber-300">Choose Workspace Directory First</h4>
              <p className="text-[10px] text-slate-400">Pick where your project files & code will be prepared</p>
            </div>
          </div>
          <button
            onClick={handleChooseFolder}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded shadow transition-all shrink-0"
          >
            Choose Folder
          </button>
        </div>
      )}

      {/* 2. Interactive Brigade Chat Stream */}
      <div ref={chatScrollRef} className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-950/60">
        {chatMessages.map((msg) => {
          const isUser = msg.sender === "user";
          const senderInfo = {
            user: { name: "You", icon: "👤", badgeColor: "text-slate-400", border: "border-amber-600" },
            headchef: { name: "Head Chef", icon: "👨‍🍳", badgeColor: "text-amber-400", border: "border-slate-800" },
            linecook: { name: "Line Cook", icon: "🍳", badgeColor: "text-sky-400", border: "border-sky-900/60" },
            plating: { name: "Plating Chef", icon: "🎨", badgeColor: "text-emerald-400", border: "border-emerald-900/60" },
            inspector: { name: "Food Inspector", icon: "🔍", badgeColor: "text-purple-400", border: "border-purple-900/60" },
            pantry: { name: "Pantry Scout", icon: "📦", badgeColor: "text-amber-300", border: "border-amber-900/60" },
          }[msg.sender] || { name: "Brigade Chef", icon: "🧑‍🍳", badgeColor: "text-slate-400", border: "border-slate-800" };

          return (
            <div key={msg.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
              <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 mb-0.5 px-1">
                <span className={`font-bold ${senderInfo.badgeColor}`}>
                  {senderInfo.icon} {senderInfo.name}
                </span>
                <span>•</span>
                <span>{msg.timestamp}</span>
              </div>

              <div
                className={`max-w-[92%] p-2.5 rounded-lg text-xs leading-relaxed ${
                  isUser
                    ? "bg-amber-600 text-slate-950 font-medium rounded-tr-none shadow-md"
                    : `bg-slate-900 border ${senderInfo.border} text-slate-200 rounded-tl-none shadow-md`
                }`}
              >
                <div>{msg.text}</div>

                {/* Brigade Plan Breakdown */}
                {msg.plan && (
                  <div className="mt-2 pt-2 border-t border-slate-800 space-y-1 text-[11px] font-mono">
                    <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                      🎯 Brigade Station Assignments:
                    </div>
                    {msg.plan.linecook && (
                      <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800/60 text-slate-300">
                        <span className="text-sky-400 font-bold">🍳 Line Cook:</span> {msg.plan.linecook}
                      </div>
                    )}
                    {msg.plan.plating && (
                      <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800/60 text-slate-300">
                        <span className="text-emerald-400 font-bold">🎨 Plating Chef:</span> {msg.plan.plating}
                      </div>
                    )}
                    {msg.plan.inspector && (
                      <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800/60 text-slate-300">
                        <span className="text-amber-400 font-bold">🔍 Food Inspector:</span> {msg.plan.inspector}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Quick Suggestions when minimal chat */}
      {chatMessages.length <= 2 && (
        <div className="px-3 py-1.5 bg-slate-950/90 border-t border-slate-800/60 flex items-center space-x-1.5 overflow-x-auto text-[10px]">
          <span className="text-slate-500 shrink-0">Try:</span>
          <button
            onClick={() => setInputMessage("Build a small responsive landing page")}
            className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 shrink-0"
          >
            Build landing page
          </button>
          <button
            onClick={() => setInputMessage("Create a REST API with SQLite database")}
            className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 shrink-0"
          >
            Create REST API
          </button>
          <button
            onClick={() => setInputMessage("Add dark mode styles & clean animations")}
            className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 shrink-0"
          >
            Add dark mode
          </button>
        </div>
      )}

      {/* 4. Chat Input Form */}
      <form onSubmit={handleSend} className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center space-x-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={`Instruct Head Chef for ${activeProject?.name || "project"}...`}
          className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 placeholder:text-slate-500"
        />
        <button
          type="submit"
          disabled={!inputMessage.trim()}
          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold text-xs rounded transition-colors shadow"
        >
          Send
        </button>
      </form>
    </div>
  );
};
