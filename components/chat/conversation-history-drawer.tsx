'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Clock,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { ChatConversation } from '@/types/adoptimize';

interface ConversationHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: ChatConversation[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onDeleteConversation: (id: string) => void;
}

export function ConversationHistoryDrawer({
  isOpen,
  onClose,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
}: ConversationHistoryDrawerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  if (!isOpen) return null;

  const handleStartRename = (conv: ChatConversation) => {
    setEditingId(conv.id);
    setEditingTitle(conv.title);
  };

  const handleSaveRename = (id: string) => {
    if (editingTitle.trim()) {
      onRenameConversation(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-label="Close conversation history"
      />

      <div className="relative z-10 w-full max-w-sm bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-bold shadow-xs">
              <MessageSquare className="w-4 h-4 text-[#00d67d]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-950">Chat History</h3>
              <p className="text-[11px] text-slate-500">
                {conversations.length} saved {conversations.length === 1 ? 'session' : 'sessions'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action: New Chat */}
        <div className="p-4 border-b border-slate-100">
          <button
            onClick={() => {
              onNewConversation();
              onClose();
            }}
            className="w-full py-2.5 px-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#00d67d]" />
            <span>Start New Conversation</span>
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {conversations.length === 0 ? (
            <div className="text-center py-12 px-4 text-slate-400 text-xs">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
              <p>No previous conversations found.</p>
              <p className="mt-1 text-[11px]">Your chat history will be safely preserved here.</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              const isEditing = editingId === conv.id;

              return (
                <div
                  key={conv.id}
                  className={`group relative p-3 rounded-2xl border transition-all ${
                    isActive
                      ? 'bg-emerald-50/60 border-emerald-300 shadow-2xs'
                      : 'bg-white hover:bg-slate-50 border-slate-200/80'
                  }`}
                >
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(conv.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                        className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <button
                        onClick={() => handleSaveRename(conv.id)}
                        className="p-1 text-emerald-600 hover:bg-emerald-100 rounded-md cursor-pointer"
                        title="Save"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1 text-slate-400 hover:bg-slate-200 rounded-md cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => {
                          onSelectConversation(conv.id);
                          onClose();
                        }}
                        className="flex-1 text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs font-bold line-clamp-1 ${
                              isActive ? 'text-slate-950' : 'text-slate-800'
                            }`}
                          >
                            {conv.title}
                          </span>
                          {isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00c06f] shrink-0" />
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-medium">
                          <span>
                            {conv.messages.length}{' '}
                            {conv.messages.length === 1 ? 'message' : 'messages'}
                          </span>
                          <span>•</span>
                          <span>{new Date(conv.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </button>

                      {/* Hover Actions: Rename & Delete */}
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => handleStartRename(conv)}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md cursor-pointer"
                          title="Rename"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => onDeleteConversation(conv.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
