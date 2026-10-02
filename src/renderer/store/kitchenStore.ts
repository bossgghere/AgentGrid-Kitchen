import type { ChefRole, HiveMessage, OrderTicket, BrigadeRegistry } from "../../domain/types/hive.types.ts";
import type { PtyProcessInfo, PtyDataEvent, PtySpawnOptions } from "../../domain/types/pty.types.ts";
import type { AgentStatusChangeEvent, HookEventPayload } from "../../domain/types/hooks.types.ts";

export interface KitchenState {
  activeTab: ChefRole;
  registry: Partial<BrigadeRegistry>;
  tickets: OrderTicket[];
  activeAgents: PtyProcessInfo[];
  terminalLogs: Record<ChefRole, string>;
  messages: HiveMessage[];
  hooks: HookEventPayload[];

  // Actions
  setActiveTab: (tab: ChefRole) => void;
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

const DEFAULT_LOGS: Record<ChefRole, string> = {
  headchef: "👨‍🍳 [Head Chef Pass] Waiting for order tickets...\n",
  plating: "🎨 [Plating Chef Station] Visual canvas ready.\n",
  linecook: "👨‍🍳 [Line Cook Station] Code stove preheated.\n",
  pantry: "📦 [Pantry Scout Station] Ingredients & docs ready.\n",
  inspector: "🔍 [Food Inspector Station] QA testing bench initialized.\n",
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

const storeInstance = new ReactiveStore<KitchenState>((set, get) => ({
  activeTab: "headchef",
  registry: {},
  tickets: [],
  activeAgents: [],
  terminalLogs: { ...DEFAULT_LOGS },
  messages: [],
  hooks: [],

  setActiveTab: (tab) => set({ activeTab: tab }),

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
      set((state) => ({ tickets: [...state.tickets, created] }));
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
      const currentLog = state.terminalLogs[role] || "";
      const updatedLog = (currentLog + data).slice(-5000);
      return {
        terminalLogs: {
          ...state.terminalLogs,
          [role]: updatedLog,
        },
      };
    });
  },

  handleStatusChange: (statusEvent) => {
    set((state) => {
      const role = statusEvent.agentRole;
      const currentEntry = state.registry[role] || {
        role,
        title: role,
        status: "idle",
        lastActive: new Date().toISOString(),
      };

      return {
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
    set((state) => ({
      messages: [message, ...state.messages].slice(0, 50),
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
