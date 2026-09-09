import React from 'react';
import { MessageSquare, Send } from 'lucide-react';

interface FloatingChatWidgetProps {
  isOpen: boolean;
  unreadCount: number;
  onOpenChat: () => void;
}

export const FloatingChatWidget: React.FC<FloatingChatWidgetProps> = ({
  isOpen,
  unreadCount,
  onOpenChat,
}) => {
  if (isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center">
      <button
        id="floating-chat-launcher"
        type="button"
        onClick={onOpenChat}
        className="group relative flex items-center gap-2.5 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 cursor-pointer focus:outline-none focus:ring-4 focus:ring-indigo-300"
        title="Open Team & Friends Chat Box (with Telegram dispatch)"
        aria-label="Open Chat Box"
      >
        <div className="relative">
          <MessageSquare className="w-5 h-5 text-white transition-transform group-hover:scale-110" />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white"></span>
          </span>
        </div>

        <span className="text-xs font-bold tracking-wide">Chat Box</span>

        {/* Telegram badge indicator */}
        <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-500/80 rounded-full text-indigo-100">
          <Send className="w-2.5 h-2.5 rotate-[-20deg]" />
          <span>Telegram</span>
        </span>

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span className="min-w-[20px] h-5 px-1.5 bg-rose-500 text-white text-[11px] font-extrabold rounded-full flex items-center justify-center shadow-xs border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};
