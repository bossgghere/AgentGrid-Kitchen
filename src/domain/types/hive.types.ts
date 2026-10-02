/**
 * Station Chef Roles in the Kitchen Brigade System
 */
export type ChefRole = "headchef" | "plating" | "linecook" | "pantry" | "inspector";

/**
 * Message Act Types for Inter-Agent Communication
 */
export type MessageAct = "request" | "response" | "done" | "escalation" | "error";

/**
 * Ticket Status Types for Order Ticket Ledger
 */
export type TicketStatus = "pending" | "in_progress" | "review" | "completed" | "failed";

/**
 * Chef Operational Status Types
 */
export type ChefStatus = "idle" | "working" | "blocked" | "offline";

/**
 * Hive Message Payload transferred between agent outbox/inbox directories
 */
export interface HiveMessage {
  id: string;
  from: ChefRole;
  to: ChefRole;
  act: MessageAct;
  subject: string;
  body: string;
  ticketId?: string;
  hops?: number;
  timestamp: string;
}

/**
 * Order Ticket in the Kitchen Task Ledger (tickets.json)
 */
export interface OrderTicket {
  id: string;
  title: string;
  description: string;
  assignee: ChefRole;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Brigade Roster Registry Entity (registry.json)
 */
export interface ChefRegistryEntry {
  role: ChefRole;
  title: string;
  status: ChefStatus;
  currentTicketId?: string;
  lastActive: string;
}

export type BrigadeRegistry = Record<ChefRole, ChefRegistryEntry>;
