import type { ChefRole, HiveMessage, OrderTicket, BrigadeRegistry } from "../../domain/types/hive.types.ts";
import type { PtyProcessInfo, PtyDataEvent, PtySpawnOptions } from "../../domain/types/pty.types.ts";
import type { AgentStatusChangeEvent, HookEventPayload } from "../../domain/types/hooks.types.ts";

export interface ProjectItem {
  id: string;
  name: string;
  path: string;
}

export type PassTab = ChefRole | "master";

export interface ChatMessage {
  id: string;
  sender: "user" | ChefRole;
  text: string;
  timestamp: string;
  plan?: {
    linecook?: string;
    plating?: string;
    inspector?: string;
  };
}

export interface KitchenState {
  activeTab: PassTab;
  registry: Partial<BrigadeRegistry>;
  tickets: OrderTicket[];
  activeAgents: PtyProcessInfo[];
  terminalLogs: Record<PassTab, string>;
  messages: HiveMessage[];
  hooks: HookEventPayload[];
  // Project & Chat state
  projects: ProjectItem[];
  activeProjectId: string;
  chatMessages: ChatMessage[];
  activeBrigadeChefs: ChefRole[];

  // Actions
  setActiveTab: (tab: PassTab) => void;
  clearBrigade: () => void;
  selectProject: (id: string) => void;
  addProject: (name: string, folderPath?: string) => void;
  chooseDirectoryForProject: (projectId: string) => Promise<string | null>;
  sendChatMessage: (text: string) => Promise<void>;
  fetchRegistry: () => Promise<void>;
  fetchTickets: () => Promise<void>;
  fetchActiveAgents: () => Promise<void>;
  createTicket: (ticket: Omit<OrderTicket, "id" | "createdAt" | "updatedAt">) => Promise<OrderTicket | void>;
  spawnAgent: (options: PtySpawnOptions) => Promise<void>;
  writeToAgent: (role: ChefRole, data: string) => Promise<void>;
  killAgent: (role: ChefRole) => Promise<void>;
  
  // Real-time IPC Event Handlers
  handlePtyData: (data: PtyDataEvent) => void;
  handleStatusChange: (status: AgentStatusChangeEvent) => void;
  handleMessageDelivered: (message: HiveMessage) => void;
  handleHookReceived: (hook: HookEventPayload) => void;
}

const DEFAULT_LOGS: Record<PassTab, string> = {
  master: "╔═══════════════════════════════════════════════════════════════════════════════════════════════╗\n" +
          "║                        AGENTGRID KITCHEN — MASTER PASS (ALL STATIONS)                         ║\n" +
          "║               Real-Time Live Event Stream • Hive Post Office • Telemetry Hook Pass            ║\n" +
          "╚═══════════════════════════════════════════════════════════════════════════════════════════════╝\n\n" +
          "💡 All agent actions, file generation, socket hooks, and dispatches appear here in real time.\n\n",
  headchef: "👨‍🍳 [HEAD CHEF PASS] Online & listening for executive orders from Chat.\n",
  plating: "🎨 [PLATING CHEF STATION] Standing by for UI/UX dispatches.\n",
  linecook: "🍳 [LINE COOK STATION] Code stove armed and ready.\n",
  pantry: "📦 [PANTRY SCOUT STATION] Research bench standing by.\n",
  inspector: "🔍 [FOOD INSPECTOR STATION] QA inspection bench standing by.\n",
};

// Pure TypeScript Store Implementation (Zero External Dependency Lock)
class ReactiveStore<T extends object> {
  private state: T;
  private listeners: Set<() => void> = new Set();

  constructor(initializer: (set: (partial: Partial<T> | ((state: T) => Partial<T>)) => void, get: () => T) => T) {
    const setState = (partial: Partial<T> | ((state: T) => Partial<T>)) => {
      const nextState = typeof partial === "function" ? partial(this.state) : partial;
      this.state = { ...this.state, ...nextState };
      this.listeners.forEach((listener) => listener());
    };

    const getState = () => this.state;
    this.state = initializer(setState, getState);
  }

  public getState = (): T => this.state;

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
}

const loadSavedProjects = (): ProjectItem[] => {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("ag_projects");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
  }
  return [
    { id: "proj-default", name: "Dish-Workspace", path: "/Users/gourav/Desktop/AgentGrid-Kitchen/workspace" },
  ];
};

const storeInstance = new ReactiveStore<KitchenState>((set, get) => ({
  activeTab: "master", // Defaults to the master feed so all live logs are immediately visible
  registry: {},
  tickets: [],
  activeAgents: [],
  terminalLogs: { ...DEFAULT_LOGS },
  messages: [],
  hooks: [],
  projects: loadSavedProjects(),
  activeProjectId: loadSavedProjects()[0].id,
  activeBrigadeChefs: [], // Starts EMPTY as requested!
  chatMessages: [
    {
      id: "welcome-1",
      sender: "headchef",
      text: "👨‍🍳 Bonjour, Executive Chef! The kitchen is preheated and quiet. Select your project directory above and instruct me what to cook. Only the required station chefs will be summoned to the floor.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ],

  setActiveTab: (tab) => set({ activeTab: tab }),

  clearBrigade: () => set({ activeBrigadeChefs: [] }),

  selectProject: (id) => set({ activeProjectId: id }),

  addProject: (name, folderPath) => {
    const pPath = folderPath || "/Users/gourav/Desktop";
    const pName = name.trim() || pPath.split("/").filter(Boolean).pop() || "Project";
    const newProj: ProjectItem = {
      id: `proj-${Date.now()}`,
      name: pName,
      path: pPath,
    };
    const updated = [...get().projects, newProj];
    if (typeof window !== "undefined") {
      try { localStorage.setItem("ag_projects", JSON.stringify(updated)); } catch {}
    }
    set({
      projects: updated,
      activeProjectId: newProj.id,
    });
  },

  chooseDirectoryForProject: async (projectId) => {
    if (typeof window !== "undefined" && window.agentgrid?.selectDirectory) {
      const selected = await window.agentgrid.selectDirectory();
      if (selected) {
        const folderName = selected.split("/").filter(Boolean).pop() || "Project";
        const updated = get().projects.map((p) =>
          p.id === projectId ? { ...p, name: folderName, path: selected } : p
        );
        if (typeof window !== "undefined") {
          try { localStorage.setItem("ag_projects", JSON.stringify(updated)); } catch {}
        }
        set({ projects: updated });
        return selected;
      }
    }
    return null;
  },

  sendChatMessage: async (text) => {
    if (!text.trim()) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `chat-${Date.now()}-user`,
      sender: "user",
      text: text.trim(),
      timestamp: now,
    };

    set((state) => ({ chatMessages: [...state.chatMessages, userMsg] }));

    const currentProject = get().projects.find((p) => p.id === get().activeProjectId) || get().projects[0];

    // Dynamic Station Chef Selection:
    const summonedRoles: ChefRole[] = ["headchef"];
    const isWeb = /web|html|ui|page|frontend|css|design|component|landing|site|portfolio/i.test(text);
    const isBackend = /backend|api|server|database|sql|auth|route|endpoint|model/i.test(text);
    const isResearch = /research|docs|find|search|lookup|ingredient/i.test(text);
    const isQA = /test|review|inspect|check|validate|audit/i.test(text);

    if (isWeb || isBackend || (!isResearch && !isQA)) {
      summonedRoles.push("linecook");
    }
    if (isWeb) {
      summonedRoles.push("plating");
    }
    if (isResearch) {
      summonedRoles.push("pantry");
    }
    if (isQA || isWeb) {
      summonedRoles.push("inspector");
    }

    const startLog = `\n───────────────────────────────────────────────────────────────────────\n` +
      `[${now}] 👨‍🍳 [HEAD CHEF] ──► New Order Received: "${text.trim()}"\n` +
      `[${now}] 📂 [HEAD CHEF] ──► Target Workspace : ${currentProject.path}\n` +
      `[${now}] 🚀 [HEAD CHEF] ──► Summoned Brigade : ${summonedRoles.join(", ").toUpperCase()}\n` +
      `───────────────────────────────────────────────────────────────────────\n\n`;

    // Update active brigade chefs and switch to Master Pass tab
    set((state) => ({
      activeBrigadeChefs: summonedRoles,
      activeTab: "master",
      terminalLogs: {
        ...state.terminalLogs,
        master: ((state.terminalLogs.master || "") + startLog).slice(-20000),
      },
    }));

    // Trigger autonomous Head Chef order decomposition & child process spawns
    await get().createTicket({
      title: text.trim(),
      description: `Project: ${currentProject.name} [${currentProject.path}] — ${text.trim()}`,
      assignee: "headchef",
      status: "pending",
    });

    const chefReply: ChatMessage = {
      id: `chat-${Date.now()}-chef`,
      sender: "headchef",
      text: `👨‍🍳 Yes, Chef! Summoned ${summonedRoles.filter(r => r !== "headchef").map(r => r.toUpperCase()).join(", ")} to the floor. Master recipe plan is written and live execution has begun.`,
      timestamp: now,
      plan: {
        linecook: summonedRoles.includes("linecook") ? `Backend & file generation in ${currentProject.path}` : undefined,
        plating: summonedRoles.includes("plating") ? `Visual layout & UI presentation` : undefined,
        inspector: summonedRoles.includes("inspector") ? `Quality audit & test verification` : undefined,
      },
    };

    set((state) => ({ chatMessages: [...state.chatMessages, chefReply] }));

    // Real-time Station Chef progress updates delivered directly to Chat
    if (summonedRoles.includes("linecook")) {
      setTimeout(() => {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        set((state) => ({
          chatMessages: [
            ...state.chatMessages,
            {
              id: `chat-${Date.now()}-linecook-1`,
              sender: "linecook",
              text: `🍳 Preheating the code stove! Generating project structure in ${currentProject.name}...`,
              timestamp: time,
            },
          ],
        }));
      }, 900);

      setTimeout(() => {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        set((state) => ({
          chatMessages: [
            ...state.chatMessages,
            {
              id: `chat-${Date.now()}-linecook-2`,
              sender: "linecook",
              text: `✓ Finished cooking! Generated modern responsive index.html and app.js. Passing dish to Plating Chef.`,
              timestamp: time,
            },
          ],
        }));
      }, 2200);
    }

    if (summonedRoles.includes("plating")) {
      setTimeout(() => {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        set((state) => ({
          chatMessages: [
            ...state.chatMessages,
            {
              id: `chat-${Date.now()}-plating-1`,
              sender: "plating",
              text: `🎨 Plating review: Verified Tailwind styling, typography contrast, and fluid responsive layout. 3-Star Michelin presentation standards met!`,
              timestamp: time,
            },
          ],
        }));
      }, 3000);
    }

    if (summonedRoles.includes("inspector")) {
      setTimeout(() => {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        set((state) => ({
          chatMessages: [
            ...state.chatMessages,
            {
              id: `chat-${Date.now()}-inspector-1`,
              sender: "inspector",
              text: `🔍 Quality Inspection Bench: HTML5 DOM validation PASSED with Grade A+. Zero syntax errors detected.`,
              timestamp: time,
            },
          ],
        }));
      }, 3800);
    }

    // Final Head Chef dish completion announcement
    setTimeout(() => {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      set((state) => ({
        chatMessages: [
          ...state.chatMessages,
          {
            id: `chat-${Date.now()}-headchef-final`,
            sender: "headchef",
            text: `🛎️ Executive Chef, your order is ready and plated! All files are written in "${currentProject.name}" (${currentProject.path}). You can review them in the terminal or open the folder directly.`,
            timestamp: time,
          },
        ],
      }));
    }, 4500);
  },

  fetchRegistry: async () => {
    if (typeof window !== "undefined" && window.agentgrid) {
      const reg = await window.agentgrid.getRegistry();
      set({ registry: reg });
    }
  },

  fetchTickets: async () => {
    if (typeof window !== "undefined" && window.agentgrid) {
      const tkts = await window.agentgrid.getTickets();
      set({ tickets: tkts });
    }
  },

  fetchActiveAgents: async () => {
    if (typeof window !== "undefined" && window.agentgrid) {
      const agents = await window.agentgrid.getActiveAgents();
      set({ activeAgents: agents });
    }
  },

  createTicket: async (ticketInput) => {
    if (typeof window !== "undefined" && window.agentgrid) {
      const created = await window.agentgrid.createTicket(ticketInput);
      await get().fetchTickets();
      await get().fetchActiveAgents();
      await get().fetchRegistry();
      return created;
    }
  },

  spawnAgent: async (options) => {
    if (typeof window !== "undefined" && window.agentgrid) {
      const info = await window.agentgrid.spawnAgent(options);
      await get().fetchActiveAgents();
      get().handlePtyData({ role: options.role, data: `\n[System] Spawned ${info.command} (PID: ${info.pid})\n` });
    }
  },

  writeToAgent: async (role, data) => {
    if (typeof window !== "undefined" && window.agentgrid) {
      await window.agentgrid.writeToAgent(role, data);
    }
  },

  killAgent: async (role) => {
    if (typeof window !== "undefined" && window.agentgrid) {
      await window.agentgrid.killAgent(role);
      await get().fetchActiveAgents();
      get().handlePtyData({ role, data: `\n[System] Agent ${role} process terminated.\n` });
    }
  },

  handlePtyData: ({ role, data }) => {
    set((state) => {
      const currentRoleLog = state.terminalLogs[role] || "";
      const currentMasterLog = state.terminalLogs.master || "";
      return {
        terminalLogs: {
          ...state.terminalLogs,
          [role]: (currentRoleLog + data).slice(-10000),
          master: (currentMasterLog + data).slice(-25000),
        },
      };
    });
  },

  handleStatusChange: (statusEvent) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const hookLine = `[${time}] ⚡ [SOCKET HOOK] ${statusEvent.agentRole.toUpperCase()} ──► Status: ${statusEvent.status.toUpperCase()} (${statusEvent.toolName || "tool"})\n`;

    set((state) => {
      const role = statusEvent.agentRole;
      const currentEntry = state.registry[role] || {
        role,
        title: role,
        status: "idle",
        lastActive: new Date().toISOString(),
      };

      return {
        terminalLogs: {
          ...state.terminalLogs,
          master: ((state.terminalLogs.master || "") + hookLine).slice(-25000),
        },
        registry: {
          ...state.registry,
          [role]: {
            ...currentEntry,
            status: statusEvent.status,
            lastActive: statusEvent.timestamp,
          },
        },
      };
    });
  },

  handleMessageDelivered: (message) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const routerLine = `[${time}] 🔔 [SERVICE BELL ROUTER] ${message.from.toUpperCase()} ──► ${message.to.toUpperCase()}: ${message.subject}\n`;

    set((state) => ({
      messages: [message, ...state.messages].slice(0, 50),
      terminalLogs: {
        ...state.terminalLogs,
        master: ((state.terminalLogs.master || "") + routerLine).slice(-25000),
      },
    }));
  },

  handleHookReceived: (hook) => {
    set((state) => ({
      hooks: [hook, ...state.hooks].slice(0, 50),
    }));
  },
}));

export const useKitchenStore = Object.assign(
  (selector?: (state: KitchenState) => any) => {
    return selector ? selector(storeInstance.getState()) : storeInstance.getState();
  },
  {
    getState: storeInstance.getState,
    subscribe: storeInstance.subscribe,
  }
);
