export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

export interface TaskLocation {
  latitude: number;
  longitude: number;
  address?: string;
  accuracy?: number;
  taggedAt: string;
}

export interface ScheduleItem {
  id: string;
  day: string;
  responsible: string;
  keyActivities: string;
  subtasks: Subtask[];
  evaluation: number; // 0 to 100
  category: 'Maintenance' | 'Cleaning' | 'Plumbing' | 'Family' | 'General';
  safetyNotes?: string;
  location?: TaskLocation;
  updatedAt: string;
}

export interface GoogleSheetsSyncState {
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  spreadsheetTitle: string | null;
  lastSyncedAt: string | null;
  isSyncing: boolean;
}

export type ViewMode = 'table' | 'timeline' | 'analytics';
export type FilterAssignee = 'All' | 'Kibrom' | 'Assaye & Kibrom' | 'Assaye';
export type FilterStatus = 'all' | 'pending' | 'in_progress' | 'completed';

export type UserRole = 'Admin' | 'Editor' | 'Viewer';

export type PermissionAction =
  | 'create_task'
  | 'edit_task'
  | 'delete_task'
  | 'toggle_subtask'
  | 'update_evaluation'
  | 'add_subtask'
  | 'export_csv'
  | 'import_csv'
  | 'sync_sheets'
  | 'import_sheets'
  | 'manage_roles'
  | 'set_reminder'
  | 'tag_location';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
}

export type NotificationChannel = 'email' | 'sms' | 'telegram' | 'both' | 'all';

export interface TaskReminder {
  id: string;
  taskId: string;
  taskTitle: string;
  taskDay: string;
  channel: NotificationChannel;
  recipientEmail: string;
  recipientPhone: string;
  recipientTelegram?: string;
  reminderDateTime: string; // ISO date string (YYYY-MM-DDTHH:mm)
  leadTimeMinutes: number; // 0, 15, 60, 1440 (1 day)
  customNotes?: string;
  enabled: boolean;
  status: 'pending' | 'sent' | 'snoozed';
  lastSentAt?: string;
  createdAt: string;
}

export interface NotificationLog {
  id: string;
  reminderId?: string;
  taskId: string;
  taskTitle: string;
  recipient: string;
  channel: 'email' | 'sms' | 'telegram';
  message: string;
  sentAt: string;
  status: 'delivered' | 'simulated';
}

export interface LiveLocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
  address?: string;
}

export interface ChatChannel {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'direct';
  members?: string[];
  unreadCount?: number;
  lastMessage?: string;
  lastMessageTime?: string;
  avatar?: string;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderEmail?: string;
  senderRole?: UserRole | string;
  senderAvatar?: string;
  text: string;
  taskId?: string;
  taskTitle?: string;
  createdAt: string;
  reactions?: { [emoji: string]: string[] }; // emoji -> array of userNames
}

export interface FriendContact {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'online' | 'busy' | 'away' | 'offline';
  statusMessage?: string;
  avatar: string;
}

