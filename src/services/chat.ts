import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { ChatChannel, ChatMessage, FriendContact } from '../types';

export const DEFAULT_FRIENDS: FriendContact[] = [
  {
    id: 'user-kibrom',
    name: 'Kibrom',
    email: 'ab456kibrom@gmail.com',
    role: 'Admin',
    status: 'online',
    statusMessage: 'Coordinating plumbing & electrical milestones',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'user-assaye',
    name: 'Assaye',
    email: 'assaye.collab@example.com',
    role: 'Editor',
    status: 'online',
    statusMessage: 'On-site inspecting supply inventory',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'user-sarah',
    name: 'Sarah',
    email: 'sarah.field@example.com',
    role: 'Viewer',
    status: 'away',
    statusMessage: 'Reviewing safety compliance report',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'user-david',
    name: 'David',
    email: 'david.tech@example.com',
    role: 'Editor',
    status: 'busy',
    statusMessage: 'Calibrating test gauges in maintenance lab',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  },
];

export const DEFAULT_CHANNELS: ChatChannel[] = [
  {
    id: 'gemini-copilot',
    name: 'gemini-copilot',
    description: 'AI Schedule Assistant: ask for advice, feasibility checks, or workload suggestions',
    type: 'public',
  },
  {
    id: 'general-schedule',
    name: 'general-schedule',
    description: 'Team schedule coordination, deadlines, and milestone handoffs',
    type: 'public',
  },
  {
    id: 'plumbing-field',
    name: 'plumbing-field',
    description: 'Plumbing checks, water pressure tests, and valve maintenance',
    type: 'public',
  },
  {
    id: 'announcements',
    name: 'announcements',
    description: 'Important announcements and weekly wrap-up meetings',
    type: 'public',
  },
  {
    id: 'dm-kibrom',
    name: 'Kibrom (Admin)',
    description: 'Direct message with Kibrom',
    type: 'direct',
    members: ['user-kibrom'],
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'dm-assaye',
    name: 'Assaye (Editor)',
    description: 'Direct message with Assaye',
    type: 'direct',
    members: ['user-assaye'],
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'dm-sarah',
    name: 'Sarah (Viewer)',
    description: 'Direct message with Sarah',
    type: 'direct',
    members: ['user-sarah'],
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'dm-david',
    name: 'David (Editor)',
    description: 'Direct message with David',
    type: 'direct',
    members: ['user-david'],
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  },
];

const LOCAL_STORAGE_CHAT_KEY = 'activity_schedule_chat_store_v1';

// Initial seed messages for collaboration context
const INITIAL_SEEDED_MESSAGES: { [channelId: string]: ChatMessage[] } = {
  'gemini-copilot': [
    {
      id: 'msg-gemini-intro-1',
      channelId: 'gemini-copilot',
      senderId: 'bot-gemini',
      senderName: 'Gemini AI',
      senderRole: 'AI Copilot',
      senderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
      text: 'Hello! I am your Gemini Copilot. Feel free to ask me to analyze which tasks are unachievable, help prioritize your workload, or draft updates for Kibrom and Assaye.',
      createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
  ],
  'general-schedule': [
    {
      id: 'msg-seed-1',
      channelId: 'general-schedule',
      senderId: 'user-kibrom',
      senderName: 'Kibrom',
      senderEmail: 'ab456kibrom@gmail.com',
      senderRole: 'Admin',
      text: 'Good morning team! Please review the updated milestones for this week. Monday plumbing items are prepped.',
      taskId: 'item-1',
      taskTitle: 'Monday: Plumbing & Water Flow',
      createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      reactions: { '👍': ['Assaye', 'Sarah'], '🚀': ['David'] },
    },
    {
      id: 'msg-seed-2',
      channelId: 'general-schedule',
      senderId: 'user-assaye',
      senderName: 'Assaye',
      senderEmail: 'assaye.collab@example.com',
      senderRole: 'Editor',
      text: 'Understood Kibrom! I have confirmed with the warehouse for the 3/4" couplings. Delivery expected by 10 AM.',
      createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      reactions: { '✅': ['Kibrom'] },
    },
    {
      id: 'msg-seed-3',
      channelId: 'general-schedule',
      senderId: 'user-kibrom',
      senderName: 'Kibrom',
      senderEmail: 'ab456kibrom@gmail.com',
      senderRole: 'Admin',
      text: 'Great. Let us tag the live GPS coordinates on the task card once you arrive on site.',
      createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      reactions: { '👏': ['Assaye'] },
    },
  ],
  'plumbing-field': [
    {
      id: 'msg-seed-plumb-1',
      channelId: 'plumbing-field',
      senderId: 'user-kibrom',
      senderName: 'Kibrom',
      senderEmail: 'ab456kibrom@gmail.com',
      senderRole: 'Admin',
      text: 'Make sure to inspect the pressure relief valves on level 2 before closing out the subtask checklist.',
      taskId: 'item-1',
      taskTitle: 'Monday: Plumbing & Pressure Valves',
      createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      reactions: { '👍': ['Assaye'] },
    },
    {
      id: 'msg-seed-plumb-2',
      channelId: 'plumbing-field',
      senderId: 'user-assaye',
      senderName: 'Assaye',
      senderEmail: 'assaye.collab@example.com',
      senderRole: 'Editor',
      text: 'Will do! Pressure tested at 65 PSI, completely within nominal specs.',
      createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      reactions: { '🔥': ['Kibrom'] },
    },
  ],
  'dm-kibrom': [
    {
      id: 'msg-dm-kibrom-1',
      channelId: 'dm-kibrom',
      senderId: 'user-kibrom',
      senderName: 'Kibrom',
      senderEmail: 'ab456kibrom@gmail.com',
      senderRole: 'Admin',
      text: 'Hey friend! Let me know if you need any assistance updating Friday subtasks or connecting Google Sheets.',
      createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
  ],
  'dm-assaye': [
    {
      id: 'msg-dm-assaye-1',
      channelId: 'dm-assaye',
      senderId: 'user-assaye',
      senderName: 'Assaye',
      senderEmail: 'assaye.collab@example.com',
      senderRole: 'Editor',
      text: 'Hey there! Ready to collaborate whenever you are.',
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
  ],
  'dm-sarah': [
    {
      id: 'msg-dm-sarah-1',
      channelId: 'dm-sarah',
      senderId: 'user-sarah',
      senderName: 'Sarah',
      senderEmail: 'sarah.field@example.com',
      senderRole: 'Viewer',
      text: 'Hello team! I am reviewing the safety protocols and compliance checklist for this week.',
      createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    },
  ],
  'dm-david': [
    {
      id: 'msg-dm-david-1',
      channelId: 'dm-david',
      senderId: 'user-david',
      senderName: 'David',
      senderEmail: 'david.tech@example.com',
      senderRole: 'Editor',
      text: 'Hi! Maintenance gauges and calibration benchmarks are all verified for the Wednesday tasks.',
      createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    },
  ],
};

function getLocalStore(): { [channelId: string]: ChatMessage[] } {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CHAT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...INITIAL_SEEDED_MESSAGES, ...parsed };
    }
  } catch (e) {
    console.warn('Could not read local chat store:', e);
  }
  return INITIAL_SEEDED_MESSAGES;
}

function saveLocalStore(store: { [channelId: string]: ChatMessage[] }) {
  try {
    localStorage.setItem(LOCAL_STORAGE_CHAT_KEY, JSON.stringify(store));
  } catch (e) {
    console.warn('Could not write local chat store:', e);
  }
}

const CHAT_UPDATE_EVENT = 'activity_schedule_chat_update';

function notifyChatUpdate(channelId: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHAT_UPDATE_EVENT, { detail: { channelId } }));
  }
}

/**
 * Real-time subscription to channel messages
 * Listens to Firestore with seamless local cache fallback and event bus
 */
export function subscribeChannelMessages(
  channelId: string,
  onMessages: (messages: ChatMessage[]) => void
): () => void {
  // Always emit initial local store first so UI renders instantly
  const local = getLocalStore();
  const initialList = local[channelId] || [];
  onMessages(initialList);

  // Local event listener for instant optimistic updates
  const handleLocalUpdate = (e: Event) => {
    const customEvent = e as CustomEvent<{ channelId?: string }>;
    if (!customEvent.detail?.channelId || customEvent.detail.channelId === channelId) {
      const updatedLocal = getLocalStore();
      onMessages(updatedLocal[channelId] || []);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(CHAT_UPDATE_EVENT, handleLocalUpdate);
  }

  let unsubscribeFirestore = () => {};

  try {
    const messagesCol = collection(db, 'channels', channelId, 'messages');
    const q = query(messagesCol, orderBy('createdAt', 'asc'));

    unsubscribeFirestore = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteMessages: ChatMessage[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            remoteMessages.push({
              id: docSnap.id,
              channelId: data.channelId || channelId,
              senderId: data.senderId || 'user-unknown',
              senderName: data.senderName || 'Team Member',
              senderEmail: data.senderEmail,
              senderRole: data.senderRole,
              senderAvatar: data.senderAvatar,
              text: data.text || '',
              taskId: data.taskId,
              taskTitle: data.taskTitle,
              createdAt: data.createdAt || new Date().toISOString(),
              reactions: data.reactions || {},
            });
          });

          // Merge with local seed if any
          const store = getLocalStore();
          const existingLocal = store[channelId] || [];
          const remoteIds = new Set(remoteMessages.map((m) => m.id));
          const uniqueLocal = existingLocal.filter((m) => !remoteIds.has(m.id));
          const merged = [...uniqueLocal, ...remoteMessages].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );

          store[channelId] = merged;
          saveLocalStore(store);
          onMessages(merged);
        }
      },
      (error) => {
        console.info('Firestore subscription fallback to local cache:', error.message);
      }
    );
  } catch (err) {
    console.warn('Firestore subscription initialized locally:', err);
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener(CHAT_UPDATE_EVENT, handleLocalUpdate);
    }
    unsubscribeFirestore();
  };
}

/**
 * Send a new chat message to a channel / direct friend
 */
export async function sendChatMessage(
  channelId: string,
  messageData: {
    senderId: string;
    senderName: string;
    senderEmail?: string;
    senderRole?: any;
    senderAvatar?: string;
    text: string;
    taskId?: string;
    taskTitle?: string;
  }
): Promise<ChatMessage> {
  const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const fullMessage: ChatMessage = {
    id: messageId,
    channelId,
    senderId: messageData.senderId,
    senderName: messageData.senderName,
    senderEmail: messageData.senderEmail,
    senderRole: messageData.senderRole,
    senderAvatar: messageData.senderAvatar,
    text: messageData.text.trim(),
    taskId: messageData.taskId,
    taskTitle: messageData.taskTitle,
    createdAt: now,
    reactions: {},
  };

  // 1. Optimistically write to local storage
  const store = getLocalStore();
  const currentList = store[channelId] || [];
  store[channelId] = [...currentList, fullMessage];
  saveLocalStore(store);

  // Notify any active local UI listeners
  notifyChatUpdate(channelId);

  // 2. Persist to Firestore (sanitizing undefined fields)
  try {
    const docRef = doc(db, 'channels', channelId, 'messages', messageId);
    const firestoreData: Record<string, any> = {
      id: messageId,
      channelId,
      senderId: fullMessage.senderId,
      senderName: fullMessage.senderName,
      text: fullMessage.text,
      createdAt: now,
      reactions: {},
      serverTime: serverTimestamp(),
    };

    if (fullMessage.senderEmail) firestoreData.senderEmail = fullMessage.senderEmail;
    if (fullMessage.senderRole) firestoreData.senderRole = fullMessage.senderRole;
    if (fullMessage.senderAvatar) firestoreData.senderAvatar = fullMessage.senderAvatar;
    if (fullMessage.taskId) firestoreData.taskId = fullMessage.taskId;
    if (fullMessage.taskTitle) firestoreData.taskTitle = fullMessage.taskTitle;

    await setDoc(docRef, firestoreData);
  } catch (error) {
    console.warn('Firestore write completed with local cache persistence:', error);
  }

  return fullMessage;
}

/**
 * Toggle emoji reaction on a message
 */
export function toggleMessageReaction(
  channelId: string,
  messageId: string,
  emoji: string,
  userName: string
): ChatMessage[] {
  const store = getLocalStore();
  const messages = store[channelId] || [];

  const updated = messages.map((msg) => {
    if (msg.id !== messageId) return msg;

    const currentReactions = { ...(msg.reactions || {}) };
    const userList = currentReactions[emoji] || [];

    if (userList.includes(userName)) {
      currentReactions[emoji] = userList.filter((u) => u !== userName);
      if (currentReactions[emoji].length === 0) {
        delete currentReactions[emoji];
      }
    } else {
      currentReactions[emoji] = [...userList, userName];
    }

    return {
      ...msg,
      reactions: currentReactions,
    };
  });

  store[channelId] = updated;
  saveLocalStore(store);
  notifyChatUpdate(channelId);

  // Attempt remote Firestore update
  try {
    const target = updated.find((m) => m.id === messageId);
    if (target) {
      const docRef = doc(db, 'channels', channelId, 'messages', messageId);
      const firestoreData: Record<string, any> = {
        id: target.id,
        channelId,
        senderId: target.senderId,
        senderName: target.senderName,
        text: target.text,
        createdAt: target.createdAt,
        reactions: target.reactions || {},
      };
      if (target.senderEmail) firestoreData.senderEmail = target.senderEmail;
      if (target.senderRole) firestoreData.senderRole = target.senderRole;
      if (target.senderAvatar) firestoreData.senderAvatar = target.senderAvatar;
      if (target.taskId) firestoreData.taskId = target.taskId;
      if (target.taskTitle) firestoreData.taskTitle = target.taskTitle;

      setDoc(docRef, firestoreData, { merge: true }).catch((err) => {
        console.warn('Firestore reaction sync warning:', err);
      });
    }
  } catch (e) {}

  return updated;
}

/**
 * Resolves metadata for any channel or direct friend
 */
export function getChannelMeta(channelId: string): {
  id: string;
  name: string;
  type: 'public' | 'direct';
  description: string;
  avatar?: string;
  role?: string;
  status?: string;
} {
  const channel = DEFAULT_CHANNELS.find((c) => c.id === channelId);
  if (channel) {
    return {
      id: channel.id,
      name: channel.name,
      type: channel.type,
      description: channel.description || '',
      avatar: channel.avatar,
    };
  }

  // Handle direct friend channel (e.g. dm-sarah, dm-david)
  if (channelId.startsWith('dm-')) {
    const friendNameLower = channelId.replace('dm-', '').toLowerCase();
    const friend = DEFAULT_FRIENDS.find((f) => f.name.toLowerCase() === friendNameLower);
    if (friend) {
      return {
        id: channelId,
        name: `${friend.name} (${friend.role})`,
        type: 'direct',
        description: friend.statusMessage || `Direct message with ${friend.name}`,
        avatar: friend.avatar,
        role: friend.role,
        status: friend.status,
      };
    }
  }

  return {
    id: channelId,
    name: channelId,
    type: channelId.startsWith('dm-') ? 'direct' : 'public',
    description: 'Conversation channel',
  };
}

/**
 * Instant dispatch / share of chat message via Telegram
 */
export function shareChatMessageViaTelegram(text: string, taskTitle?: string) {
  let content = text.trim();
  if (taskTitle) {
    content = `📌 *Referenced Milestone:* ${taskTitle}\n\n💬 *Message:*\n${content}\n\n🔗 ${typeof window !== 'undefined' ? window.location.origin : ''}`;
  } else {
    content = `💬 *Team Chat Message:*\n${content}\n\n🔗 ${typeof window !== 'undefined' ? window.location.origin : ''}`;
  }

  const encoded = encodeURIComponent(content);
  const shareUrl = `https://t.me/share/url?text=${encoded}`;
  if (typeof window !== 'undefined') {
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  }
}

