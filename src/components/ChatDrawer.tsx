import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Users,
  Hash,
  Smile,
  Paperclip,
  Search,
  Check,
  CheckCheck,
  Circle,
  MessageSquare,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  UserCheck,
  Shield,
  Info,
  Copy,
  ArrowLeft,
  Share2,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  ChatChannel,
  ChatMessage,
  FriendContact,
  ScheduleItem,
  UserRole,
} from '../types';
import {
  DEFAULT_CHANNELS,
  DEFAULT_FRIENDS,
  subscribeChannelMessages,
  sendChatMessage,
  toggleMessageReaction,
  getChannelMeta,
  shareChatMessageViaTelegram,
} from '../services/chat';
import { askGeminiScheduleAdvisor } from '../services/gemini';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  currentUserRole: UserRole;
  tasks: ScheduleItem[];
  onSelectTask?: (task: ScheduleItem) => void;
  initialChannelId?: string;
  initialRecipientFriend?: string;
  initialTask?: ScheduleItem | null;
}

const EMOJI_PRESETS = ['👍', '❤️', '🚀', '🔥', '👏', '✅', '👀', '🎉'];

const QUICK_REPLIES = [
  'Checking on this now! 👍',
  'All tasks on track for today ✅',
  'Arrived on site, GPS updated 📍',
  'Milestone inspection complete 🚀',
];

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  user,
  currentUserRole,
  tasks,
  onSelectTask,
  initialChannelId,
  initialRecipientFriend,
  initialTask,
}) => {
  const [activeTab, setActiveTab] = useState<'channels' | 'friends'>('channels');
  const [activeChannelId, setActiveChannelId] = useState<string>(
    initialChannelId || 'general-schedule'
  );
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaskRef, setSelectedTaskRef] = useState<ScheduleItem | null>(null);
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [isTaskSelectorOpen, setIsTaskSelectorOpen] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Active persona: either authenticated Google user or current role identity
  const senderName = user?.displayName || (currentUserRole === 'Admin' ? 'Kibrom' : currentUserRole === 'Editor' ? 'Assaye' : 'Team Member');
  const senderEmail = user?.email || (currentUserRole === 'Admin' ? 'ab456kibrom@gmail.com' : 'collab@example.com');
  const senderId = user?.uid || (currentUserRole === 'Admin' ? 'user-kibrom' : currentUserRole === 'Editor' ? 'user-assaye' : 'user-guest');
  const senderAvatar = user?.photoURL || (currentUserRole === 'Admin' ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Sync initial channel if prop changes
  useEffect(() => {
    if (initialChannelId) {
      setActiveChannelId(initialChannelId);
      setActiveTab(initialChannelId.startsWith('dm-') ? 'friends' : 'channels');
    }
  }, [initialChannelId]);

  // Sync initial task if provided
  useEffect(() => {
    if (initialTask) {
      setSelectedTaskRef(initialTask);
    }
  }, [initialTask]);

  // Subscribe to active channel messages in real-time
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = subscribeChannelMessages(activeChannelId, (updatedMessages) => {
      setMessages(updatedMessages);
    });

    return () => {
      unsubscribe();
    };
  }, [activeChannelId, isOpen]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeChannel = getChannelMeta(activeChannelId);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !selectedTaskRef) return;

    const textToSend = inputText.trim() || `Referencing milestone: ${selectedTaskRef?.day} - ${selectedTaskRef?.category}`;
    const taskData = selectedTaskRef
      ? { taskId: selectedTaskRef.id, taskTitle: `${selectedTaskRef.day}: ${selectedTaskRef.category}` }
      : undefined;

    setInputText('');
    setSelectedTaskRef(null);
    setIsTaskSelectorOpen(false);
    setIsEmojiPickerOpen(false);
    setIsSending(true);

    try {
      const sent = await sendChatMessage(activeChannelId, {
        senderId,
        senderName,
        senderEmail,
        senderRole: currentUserRole,
        senderAvatar,
        text: textToSend,
        ...taskData,
      });
      if (sent) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === sent.id)) return prev;
          return [...prev, sent];
        });

        // If in gemini-copilot channel or message mentions @gemini, trigger Gemini Copilot response
        if (activeChannelId === 'gemini-copilot' || textToSend.toLowerCase().includes('@gemini')) {
          const promptText = textToSend.replace(/@gemini/gi, '').trim() || textToSend;
          setTimeout(async () => {
            try {
              const geminiReply = await askGeminiScheduleAdvisor(
                promptText,
                messages.slice(-4).map((m) => ({
                  role: m.senderId === 'bot-gemini' ? 'model' : 'user',
                  text: m.text,
                })),
                tasks
              );

              const botSent = await sendChatMessage(activeChannelId, {
                senderId: 'bot-gemini',
                senderName: 'Gemini AI',
                senderRole: 'AI Copilot',
                senderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
                text: geminiReply,
              });

              if (botSent) {
                setMessages((prev) => {
                  if (prev.some((m) => m.id === botSent.id)) return prev;
                  return [...prev, botSent];
                });
              }
            } catch (botErr) {
              console.error('Gemini bot reply error:', botErr);
            }
          }, 350);
        }
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendViaTelegram = () => {
    if (!inputText.trim() && !selectedTaskRef) return;
    const textToSend = inputText.trim() || `Milestone review: ${selectedTaskRef?.day} - ${selectedTaskRef?.category}`;
    const taskTitle = selectedTaskRef ? `${selectedTaskRef.day}: ${selectedTaskRef.category} (${selectedTaskRef.responsible})` : undefined;
    shareChatMessageViaTelegram(textToSend, taskTitle);
  };

  const handleCopyMessage = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(msgId);
    setTimeout(() => {
      setCopiedMessageId(null);
    }, 2000);
  };

  const handleReaction = (messageId: string, emoji: string) => {
    const updated = toggleMessageReaction(activeChannelId, messageId, emoji, senderName);
    setMessages(updated);
  };

  const handleQuickReply = (reply: string) => {
    setInputText(reply);
  };

  const filteredMessages = messages.filter((msg) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      msg.text.toLowerCase().includes(q) ||
      msg.senderName.toLowerCase().includes(q) ||
      (msg.taskTitle && msg.taskTitle.toLowerCase().includes(q))
    );
  });

  const filteredTasksForLink = tasks.filter((t) => {
    if (!taskSearchQuery.trim()) return true;
    const q = taskSearchQuery.toLowerCase();
    return (
      t.day.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.responsible.toLowerCase().includes(q)
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="chat-panel-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-4 sm:pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 animate-in slide-in-from-right duration-250">
          {/* Top Bar Header */}
          <div className="px-4 sm:px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs flex-shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 id="chat-panel-title" className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                    Team Chat & Friends
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Live Sync
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 truncate">
                  Chatting as <strong className="text-white">{senderName}</strong> ({currentUserRole})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Close chat box"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Chat Layout: Left Channel/Friend List & Right Message View */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* Sidebar: Channels & Friends */}
            <div
              className={`w-full md:w-60 border-r border-slate-200 bg-slate-50 flex flex-col ${
                isMobileSidebarOpen ? 'flex' : 'hidden md:flex'
              }`}
            >
              {/* Navigation Tabs */}
              <div className="p-2 border-b border-slate-200 bg-white grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('channels')}
                  className={`py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    activeTab === 'channels'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Hash className="w-3.5 h-3.5" />
                  <span>Channels</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('friends')}
                  className={`py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    activeTab === 'friends'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Friends</span>
                </button>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {activeTab === 'channels' && (
                  <>
                    <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Team Channels
                    </div>
                    {DEFAULT_CHANNELS.filter((c) => c.type === 'public').map((channel) => {
                      const isActive = activeChannelId === channel.id;
                      return (
                        <button
                          key={channel.id}
                          type="button"
                          onClick={() => {
                            setActiveChannelId(channel.id);
                            setIsMobileSidebarOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                            isActive
                              ? 'bg-indigo-50 text-indigo-900 font-semibold shadow-2xs border border-indigo-200'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <Hash className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                          <span className="truncate flex-1">{channel.name}</span>
                        </button>
                      );
                    })}
                  </>
                )}

                {activeTab === 'friends' && (
                  <>
                    <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Collaborators & Friends
                    </div>
                    {DEFAULT_FRIENDS.map((friend) => {
                      const dmChannelId = `dm-${friend.name.toLowerCase()}`;
                      const isActive = activeChannelId === dmChannelId;
                      return (
                        <button
                          key={friend.id}
                          type="button"
                          onClick={() => {
                            setActiveChannelId(dmChannelId);
                            setIsMobileSidebarOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                            isActive
                              ? 'bg-indigo-50 text-indigo-900 font-semibold shadow-2xs border border-indigo-200'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="relative flex-shrink-0">
                            <img
                              src={friend.avatar}
                              alt={friend.name}
                              className="w-7 h-7 rounded-full object-cover border border-slate-200"
                            />
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                                friend.status === 'online'
                                  ? 'bg-emerald-500'
                                  : friend.status === 'busy'
                                  ? 'bg-rose-500'
                                  : 'bg-amber-500'
                              }`}
                              title={`Status: ${friend.status}`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="truncate font-medium text-slate-900">{friend.name}</span>
                              <span className="text-[10px] text-slate-400 font-normal">{friend.role}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 truncate">{friend.statusMessage}</p>
                          </div>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>

              {/* Persona status footer */}
              <div className="p-3 border-t border-slate-200 bg-white">
                <div className="flex items-center gap-2">
                  <img
                    src={senderAvatar}
                    alt={senderName}
                    className="w-7 h-7 rounded-full object-cover border border-slate-200"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900 truncate">{senderName}</p>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Active Persona</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Conversation Stream & Composer */}
            <div
              className={`flex-1 flex flex-col bg-white min-w-0 ${
                isMobileSidebarOpen ? 'hidden md:flex' : 'flex'
              }`}
            >
              {/* Channel Header / Search */}
              <div className="px-3 sm:px-4 py-2.5 border-b border-slate-200 flex items-center justify-between gap-2 bg-white">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {/* Mobile switch back to channels list */}
                  <button
                    type="button"
                    onClick={() => setIsMobileSidebarOpen(true)}
                    className="md:hidden p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer flex-shrink-0"
                    title="View channels and contacts"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  {activeChannel.avatar ? (
                    <img
                      src={activeChannel.avatar}
                      alt={activeChannel.name}
                      className="w-7 h-7 rounded-full object-cover border border-slate-200 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                      <Hash className="w-4 h-4" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                        {activeChannel.type === 'public' ? `#${activeChannel.name}` : activeChannel.name}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 flex-shrink-0">
                        {activeChannel.type}
                      </span>
                    </div>
                    {activeChannel.description && (
                      <p className="text-[11px] text-slate-500 truncate">{activeChannel.description}</p>
                    )}
                  </div>
                </div>

                {/* In-chat search */}
                <div className="relative w-36 sm:w-44 flex-shrink-0">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-8 pr-2.5 py-1 text-xs border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5">
                {filteredMessages.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-900">No messages yet</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                      Start the conversation with your team members or friends below!
                    </p>
                  </div>
                ) : (
                  filteredMessages.map((msg) => {
                    const isSelf = msg.senderId === senderId || msg.senderName === senderName;
                    const dateFormatted = new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2.5 items-start group ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        {/* Avatar */}
                        <img
                          src={
                            msg.senderAvatar ||
                            (msg.senderName === 'Kibrom'
                              ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                              : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80')
                          }
                          alt={msg.senderName}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-slate-200 flex-shrink-0 mt-0.5"
                        />

                        {/* Bubble */}
                        <div className={`max-w-[82%] sm:max-w-[78%] flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400">
                            <span className="font-semibold text-slate-800">{msg.senderName}</span>
                            {msg.senderRole && (
                              <span className="text-[9px] px-1 py-0.2 bg-slate-100 rounded text-slate-600 font-medium">
                                {msg.senderRole}
                              </span>
                            )}
                            <span>•</span>
                            <span>{dateFormatted}</span>
                          </div>

                          <div
                            className={`p-3 rounded-2xl text-xs leading-relaxed shadow-xs ${
                              isSelf
                                ? 'bg-slate-900 text-white rounded-tr-xs'
                                : 'bg-slate-100 text-slate-800 rounded-tl-xs border border-slate-200'
                            }`}
                          >
                            {/* Task Milestone Reference Card */}
                            {msg.taskTitle && (
                              <div
                                className={`mb-2 p-2 rounded-lg border flex items-center justify-between gap-2 text-xs font-medium cursor-pointer transition-colors ${
                                  isSelf
                                    ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'
                                    : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                                }`}
                                onClick={() => {
                                  const t = tasks.find((item) => item.id === msg.taskId);
                                  if (t && onSelectTask) onSelectTask(t);
                                }}
                              >
                                <div className="min-w-0">
                                  <span className="text-[10px] text-indigo-400 font-semibold block uppercase">
                                    Referenced Milestone
                                  </span>
                                  <span className="truncate block font-semibold">{msg.taskTitle}</span>
                                </div>
                                <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                              </div>
                            )}

                            <p className="whitespace-pre-wrap">{msg.text}</p>
                          </div>

                          {/* Action row (Reactions, Telegram Share, Copy) */}
                          <div className="flex flex-wrap items-center gap-1 mt-1.5">
                            {msg.reactions &&
                              (Object.entries(msg.reactions) as [string, string[]][]).map(([emoji, usersList]) => {
                                const hasReacted = Array.isArray(usersList) && usersList.includes(senderName);
                                const count = Array.isArray(usersList) ? usersList.length : 0;
                                const titleNames = Array.isArray(usersList) ? usersList.join(', ') : '';
                                return (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => handleReaction(msg.id, emoji)}
                                    className={`px-1.5 py-0.5 rounded-full text-[11px] border flex items-center gap-1 transition-all cursor-pointer ${
                                      hasReacted
                                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                    title={`Reacted by: ${titleNames}`}
                                  >
                                    <span>{emoji}</span>
                                    <span>{count}</span>
                                  </button>
                                );
                              })}

                            {/* Add reaction trigger */}
                            <div className="relative group/emoji">
                              <button
                                type="button"
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-600 rounded transition-opacity cursor-pointer"
                                title="Add reaction"
                              >
                                <Smile className="w-3.5 h-3.5" />
                              </button>
                              <div className="hidden group-hover/emoji:flex absolute z-10 bottom-full mb-1 left-0 bg-white border border-slate-200 rounded-lg p-1 shadow-md gap-1">
                                {EMOJI_PRESETS.slice(0, 5).map((e) => (
                                  <button
                                    key={e}
                                    type="button"
                                    onClick={() => handleReaction(msg.id, e)}
                                    className="p-1 hover:bg-slate-100 rounded text-xs cursor-pointer"
                                  >
                                    {e}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Telegram Dispatch & Copy Action */}
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => handleCopyMessage(msg.id, msg.text)}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                                title="Copy message text"
                              >
                                {copiedMessageId === msg.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => shareChatMessageViaTelegram(msg.text, msg.taskTitle)}
                                className="p-1 text-sky-500 hover:text-sky-700 hover:bg-sky-50 rounded transition-colors cursor-pointer"
                                title="Send / Share via Telegram"
                              >
                                <Send className="w-3.5 h-3.5 rotate-[-20deg]" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick replies bar */}
              <div className="px-3 sm:px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto">
                <span className="text-[10px] text-slate-400 font-semibold flex-shrink-0">Quick:</span>
                {QUICK_REPLIES.map((reply) => (
                  <button
                    key={reply}
                    type="button"
                    onClick={() => handleQuickReply(reply)}
                    className="text-[11px] px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 whitespace-nowrap transition-colors flex-shrink-0 cursor-pointer shadow-2xs"
                  >
                    {reply}
                  </button>
                ))}
              </div>

              {/* Task reference preview */}
              {selectedTaskRef && (
                <div className="px-3 sm:px-4 py-2 bg-indigo-50 border-t border-indigo-100 flex items-center justify-between text-xs text-indigo-900">
                  <div className="flex items-center gap-2 truncate">
                    <Paperclip className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                    <span className="font-semibold">Linked Milestone:</span>
                    <span className="truncate">{selectedTaskRef.day} - {selectedTaskRef.category} ({selectedTaskRef.responsible})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTaskRef(null)}
                    className="p-1 text-indigo-700 hover:text-indigo-950 cursor-pointer"
                    title="Remove attached milestone"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Chat Composer */}
              <div className="p-3 border-t border-slate-200 bg-white">
                <form onSubmit={handleSendMessage} className="space-y-2">
                  <div className="relative">
                    <textarea
                      rows={2}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={`Message ${activeChannel.name}... (Press Enter to send)`}
                      className="w-full resize-none p-3 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all pr-8"
                    />

                    {inputText && (
                      <button
                        type="button"
                        onClick={() => setInputText('')}
                        className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
                        title="Clear input"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    {/* Action buttons (attach task, emoji picker) */}
                    <div className="flex items-center gap-1">
                      {/* Attach milestone */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsTaskSelectorOpen(!isTaskSelectorOpen)}
                          className={`p-1.5 sm:px-2.5 sm:py-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1 text-xs cursor-pointer border border-transparent ${
                            selectedTaskRef ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold' : ''
                          }`}
                          title="Reference a scheduled milestone"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline text-[11px]">Link Task</span>
                        </button>

                        {/* Task Selector Dropdown */}
                        {isTaskSelectorOpen && (
                          <div className="absolute z-30 bottom-full mb-2 left-0 w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-2 max-h-56 overflow-y-auto">
                            <div className="px-2 py-1 flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
                              <span className="text-[10px] font-bold uppercase text-slate-400">Select Milestone</span>
                              <button
                                type="button"
                                onClick={() => setIsTaskSelectorOpen(false)}
                                className="text-slate-400 hover:text-slate-600 text-xs"
                              >
                                ✕
                              </button>
                            </div>
                            <input
                              type="text"
                              value={taskSearchQuery}
                              onChange={(e) => setTaskSearchQuery(e.target.value)}
                              placeholder="Search day or task..."
                              className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md mb-1.5 outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <div className="space-y-1">
                              {filteredTasksForLink.map((t) => (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedTaskRef(t);
                                    setIsTaskSelectorOpen(false);
                                  }}
                                  className="w-full text-left px-2 py-1.5 text-xs rounded-lg hover:bg-indigo-50 text-slate-800 hover:text-indigo-900 transition-colors cursor-pointer"
                                >
                                  <span className="font-semibold block truncate">{t.day}: {t.category}</span>
                                  <span className="text-[10px] text-slate-500 block truncate">{t.responsible} • {t.evaluation}%</span>
                                </button>
                              ))}
                              {filteredTasksForLink.length === 0 && (
                                <p className="text-xs text-slate-400 p-2 text-center">No matching tasks</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Emoji Picker */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors text-xs cursor-pointer"
                          title="Insert emoji"
                        >
                          <Smile className="w-4 h-4" />
                        </button>

                        {isEmojiPickerOpen && (
                          <div className="absolute z-30 bottom-full mb-2 left-0 bg-white border border-slate-200 rounded-xl shadow-xl p-2 grid grid-cols-4 gap-1 w-44">
                            {EMOJI_PRESETS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => {
                                  setInputText((prev) => prev + emoji);
                                  setIsEmojiPickerOpen(false);
                                }}
                                className="p-2 text-center text-base hover:bg-slate-100 rounded-lg cursor-pointer"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Dispatch buttons: Telegram & Team Chat */}
                    <div className="flex items-center gap-1.5">
                      {/* Send via Telegram button */}
                      <button
                        type="button"
                        onClick={handleSendViaTelegram}
                        disabled={!inputText.trim() && !selectedTaskRef}
                        className="px-3 py-2 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-100 text-white disabled:text-slate-400 text-xs font-semibold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                        title="Send / Forward message directly to Telegram"
                      >
                        <Send className="w-3.5 h-3.5 rotate-[-20deg]" />
                        <span className="hidden sm:inline">Telegram</span>
                      </button>

                      {/* Standard Send button */}
                      <button
                        type="submit"
                        disabled={(!inputText.trim() && !selectedTaskRef) || isSending}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white disabled:text-slate-400 text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <span>Send</span>
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

