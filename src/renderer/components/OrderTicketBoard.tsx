import React, { useState } from "react";
import { useKitchenStore } from "../store/kitchenStore.ts";
import { CHEF_ROLES, CHEF_TITLES } from "../../domain/constants/paths.constants.ts";
import type { ChefRole, TicketStatus } from "../../domain/types/hive.types.ts";

export const OrderTicketBoard: React.FC = () => {
  const { tickets, createTicket } = useKitchenStore();
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState<ChefRole>("linecook");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await createTicket({
      title: title.trim(),
      description: description.trim(),
      assignee,
      status: "pending",
    });

    setTitle("");
    setDescription("");
    setShowModal(false);
  };

  const pendingTickets = tickets.filter((t) => t.status === "pending");
  const inProgressTickets = tickets.filter((t) => t.status === "in_progress" || t.status === "review");
  const completedTickets = tickets.filter((t) => t.status === "completed");

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-3">
      {/* Board Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-slate-100">📋 Order Ticket Board</h2>
          <p className="text-[10px] text-slate-400">Expedition Task Ledger</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded transition-colors"
        >
          + New Order Ticket
        </button>
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-3 gap-2 flex-1 overflow-hidden">
        {/* Pending Column */}
        <div className="bg-slate-950/60 p-2 rounded border border-slate-800 flex flex-col">
          <h3 className="text-xs font-semibold text-amber-400 mb-2 flex justify-between">
            <span>Pending</span>
            <span className="bg-amber-950/80 px-1.5 py-0.5 rounded text-[10px]">{pendingTickets.length}</span>
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2">
            {pendingTickets.map((t) => (
              <div key={t.id} className="bg-slate-900 border border-slate-800 p-2 rounded text-xs space-y-1">
                <div className="font-semibold text-slate-200">{t.title}</div>
                <div className="text-[10px] text-slate-400">{t.description}</div>
                <div className="text-[9px] text-amber-500 font-bold">Assignee: {t.assignee}</div>
              </div>
            ))}
          </div>
        </div>

        {/* In Progress Column */}
        <div className="bg-slate-950/60 p-2 rounded border border-slate-800 flex flex-col">
          <h3 className="text-xs font-semibold text-sky-400 mb-2 flex justify-between">
            <span>Cooking</span>
            <span className="bg-sky-950/80 px-1.5 py-0.5 rounded text-[10px]">{inProgressTickets.length}</span>
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2">
            {inProgressTickets.map((t) => (
              <div key={t.id} className="bg-slate-900 border border-slate-800 p-2 rounded text-xs space-y-1">
                <div className="font-semibold text-slate-200">{t.title}</div>
                <div className="text-[10px] text-slate-400">{t.description}</div>
                <div className="text-[9px] text-sky-400 font-bold">Assignee: {t.assignee}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Completed Column */}
        <div className="bg-slate-950/60 p-2 rounded border border-slate-800 flex flex-col">
          <h3 className="text-xs font-semibold text-emerald-400 mb-2 flex justify-between">
            <span>Served</span>
            <span className="bg-emerald-950/80 px-1.5 py-0.5 rounded text-[10px]">{completedTickets.length}</span>
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2">
            {completedTickets.map((t) => (
              <div key={t.id} className="bg-slate-900 border border-slate-800 p-2 rounded text-xs space-y-1">
                <div className="font-semibold text-slate-200">{t.title}</div>
                <div className="text-[10px] text-slate-400">{t.description}</div>
                <div className="text-[9px] text-emerald-400 font-bold">Done</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal for New Ticket */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreate} className="bg-slate-900 border border-slate-700 rounded-lg p-4 w-full max-w-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-100">Issue New Guest Order Ticket</h3>
            
            <div>
              <label className="text-[10px] text-slate-400">Order Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Build User Login Form"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details of the recipe feature..."
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400">Assign Station Chef</label>
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value as ChefRole)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                {CHEF_ROLES.map((role) => (
                  <option key={role} value={role}>{CHEF_TITLES[role]}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded"
              >
                Issue Ticket
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
