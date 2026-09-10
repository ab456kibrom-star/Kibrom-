/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import {
  ScheduleItem,
  ViewMode,
  FilterAssignee,
  FilterStatus,
  GoogleSheetsSyncState,
  UserRole,
  PermissionAction,
  AppUser,
  TaskReminder,
  NotificationLog,
  TaskLocation,
} from './types';
import { INITIAL_SCHEDULE } from './data/initialData';
import { initAuth, googleSignIn, logout } from './services/auth';
import {
  createScheduleSpreadsheet,
  updateScheduleSpreadsheet,
  fetchScheduleFromSpreadsheet,
  exportToCsv,
} from './services/sheets';
import { DEFAULT_USERS, hasPermission } from './services/rbac';
import {
  isTaskDueToday,
  formatEmailNotification,
  formatSmsNotification,
  formatTelegramNotification,
  sendTelegramNotification,
  requestBrowserNotificationPermission,
  triggerBrowserNotification,
} from './services/notifications';
import { Header } from './components/Header';
import { SummaryStats } from './components/SummaryStats';
import { ScheduleTable } from './components/ScheduleTable';
import { TimelineCards } from './components/TimelineCards';
import { AnalyticsView } from './components/AnalyticsView';
import { TaskModal } from './components/TaskModal';
import { SheetsSyncModal } from './components/SheetsSyncModal';
import { ConfirmModal } from './components/ConfirmModal';
import { RbacManagementModal } from './components/RbacManagementModal';
import { AccessDeniedModal } from './components/AccessDeniedModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { TaskReminderModal } from './components/TaskReminderModal';
import { LiveLocationModal } from './components/LiveLocationModal';
import { ChatDrawer } from './components/ChatDrawer';
import { FloatingChatWidget } from './components/FloatingChatWidget';
import { GeminiScheduleCopilot } from './components/GeminiScheduleCopilot';
import { CalendarExportModal } from './components/CalendarExportModal';
import { CsvImportModal } from './components/CsvImportModal';
import {
  validateFirestoreConnection,
  subscribeToScheduleItems,
  saveScheduleItemToFirestore,
  batchSaveScheduleItemsToFirestore,
  deleteScheduleItemFromFirestore,
} from './services/scheduleFirestore';

const STORAGE_KEY = 'activity_schedule_data_v1';
const SYNC_STORAGE_KEY = 'activity_schedule_sync_meta_v1';
const USERS_STORAGE_KEY = 'activity_schedule_users_v1';
const ROLE_STORAGE_KEY = 'activity_schedule_active_role_v1';
const REMINDERS_STORAGE_KEY = 'activity_schedule_reminders_v1';
const NOTIF_LOGS_STORAGE_KEY = 'activity_schedule_notif_logs_v1';

export default function App() {
  // 1. Core schedule items state with localStorage persistence
  const [items, setItems] = useState<ScheduleItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Could not read from localStorage:', e);
    }
    return INITIAL_SCHEDULE;
  });

  // 2. View and Filter States
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedAssignee, setSelectedAssignee] = useState<FilterAssignee>('All');
  const [selectedStatus, setSelectedStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 3. RBAC State (Roles: Admin, Editor, Viewer)
  const [users, setUsers] = useState<AppUser[]>(() => {
    try {
      const saved = localStorage.getItem(USERS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_USERS;
  });

  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(() => {
    try {
      const saved = localStorage.getItem(ROLE_STORAGE_KEY);
      if (saved === 'Admin' || saved === 'Editor' || saved === 'Viewer') {
        return saved;
      }
    } catch (e) {}
    return 'Admin';
  });

  const [isRbacModalOpen, setIsRbacModalOpen] = useState(false);
  const [accessDeniedState, setAccessDeniedState] = useState<{
    isOpen: boolean;
    action: PermissionAction | null;
  }>({
    isOpen: false,
    action: null,
  });

  // 4. Auth & Google Sheets State
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [syncState, setSyncState] = useState<GoogleSheetsSyncState>(() => {
    try {
      const saved = localStorage.getItem(SYNC_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return {
      spreadsheetId: null,
      spreadsheetUrl: null,
      spreadsheetTitle: null,
      lastSyncedAt: null,
      isSyncing: false,
    };
  });

  // 5. Notification Reminders & History State
  const [reminders, setReminders] = useState<TaskReminder[]>(() => {
    try {
      const saved = localStorage.getItem(REMINDERS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: 'rem-kibrom-plumbing',
        taskId: 'item-1',
        taskTitle: 'Plumbing - Kibrom',
        taskDay: 'Monday',
        channel: 'both',
        recipientEmail: 'ab456kibrom@gmail.com',
        recipientPhone: '+1 (555) 019-2834',
        reminderDateTime: new Date().toISOString().slice(0, 16),
        leadTimeMinutes: 60,
        customNotes: 'Bring plumber tape, Teflon sealant, and inspect under-sink shut-off valves',
        enabled: true,
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    ];
  });

  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>(() => {
    try {
      const saved = localStorage.getItem(NOTIF_LOGS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: 'init-log-1',
        taskId: 'item-1',
        taskTitle: 'Plumbing Inspection - Kibrom',
        recipient: 'ab456kibrom@gmail.com',
        channel: 'email',
        message: 'Milestone reminder dispatched for Monday maintenance schedule.',
        sentAt: new Date(Date.now() - 3600000).toISOString(),
        status: 'delivered',
      },
    ];
  });

  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminderTargetTask, setReminderTargetTask] = useState<ScheduleItem | null>(null);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | 'unsupported'>('default');

  // 6. Live Location State
  const [isLiveLocationModalOpen, setIsLiveLocationModalOpen] = useState(false);

  // 7. Real-Time Chat with Friends State
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [chatTargetChannelId, setChatTargetChannelId] = useState<string>('general-schedule');
  const [chatTargetTask, setChatTargetTask] = useState<ScheduleItem | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(2);

  const handleOpenChatWithTask = (task?: ScheduleItem) => {
    if (task) {
      const channel = task.category.toLowerCase().includes('plumb') ? 'plumbing-field' : 'general-schedule';
      setChatTargetChannelId(channel);
      setChatTargetTask(task);
    } else {
      setChatTargetTask(null);
    }
    setIsChatDrawerOpen(true);
    setUnreadChatCount(0);
  };

  // 8. Modal States
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isGeminiCopilotOpen, setIsGeminiCopilotOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [calendarItemToExport, setCalendarItemToExport] = useState<ScheduleItem | null>(null);

  const handleOpenCalendarExport = (item?: ScheduleItem) => {
    setCalendarItemToExport(item || null);
    setIsCalendarModalOpen(true);
  };

  // Destructive operations confirmation dialog state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Calculate tasks due today using schedule matching
  const tasksDueToday = useMemo(() => {
    return items.filter((item) => isTaskDueToday(item));
  }, [items]);

  // Read initial browser notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPermission(Notification.permission);
    } else {
      setBrowserPermission('unsupported');
    }
  }, []);

  // Persist Reminders and Notification Logs
  useEffect(() => {
    try {
      localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminders));
    } catch (e) {}
  }, [reminders]);

  useEffect(() => {
    try {
      localStorage.setItem(NOTIF_LOGS_STORAGE_KEY, JSON.stringify(notificationLogs));
    } catch (e) {}
  }, [notificationLogs]);

  // Automated background interval checking for due reminders (runs every 30s)
  useEffect(() => {
    const checkScheduledReminders = () => {
      const now = Date.now();
      setReminders((prev) => {
        let hasChanges = false;
        const updated = prev.map((rem) => {
          if (!rem.enabled || rem.status === 'sent') return rem;

          const triggerTime =
            new Date(rem.reminderDateTime).getTime() - rem.leadTimeMinutes * 60 * 1000;

          if (now >= triggerTime) {
            hasChanges = true;
            const task = items.find((t) => t.id === rem.taskId);
            if (task) {
              // Trigger native browser notification
              triggerBrowserNotification(
                `Task Due Alert: ${task.day} - ${task.category}`,
                `Responsible: ${task.responsible} (${task.evaluation}% done)\n${task.keyActivities.slice(0, 90)}`
              );

              // Append to sent logs
              const newEntries: NotificationLog[] = [];
              if (rem.channel === 'telegram' || rem.channel === 'all') {
                newEntries.push({
                  id: `log-${Date.now()}-telegram`,
                  reminderId: rem.id,
                  taskId: rem.taskId,
                  taskTitle: `${task.day}: ${task.category}`,
                  recipient: rem.recipientTelegram || '@kibrom',
                  channel: 'telegram',
                  message: `Telegram automated reminder for ${task.day} (${task.responsible}). Progress: ${task.evaluation}%. Notes: ${rem.customNotes || 'None'}`,
                  sentAt: new Date().toISOString(),
                  status: 'delivered',
                });
              }
              if (rem.channel === 'email' || rem.channel === 'both' || rem.channel === 'all') {
                newEntries.push({
                  id: `log-${Date.now()}-email`,
                  reminderId: rem.id,
                  taskId: rem.taskId,
                  taskTitle: `${task.day}: ${task.category}`,
                  recipient: rem.recipientEmail,
                  channel: 'email',
                  message: `Automated Email reminder for scheduled task (${task.responsible}). Progress: ${task.evaluation}%. Notes: ${rem.customNotes || 'None'}`,
                  sentAt: new Date().toISOString(),
                  status: 'delivered',
                });
              }
              if (rem.channel === 'sms' || rem.channel === 'both' || rem.channel === 'all') {
                newEntries.push({
                  id: `log-${Date.now()}-sms`,
                  reminderId: rem.id,
                  taskId: rem.taskId,
                  taskTitle: `${task.day}: ${task.category}`,
                  recipient: rem.recipientPhone,
                  channel: 'sms',
                  message: formatSmsNotification(task, rem.customNotes),
                  sentAt: new Date().toISOString(),
                  status: 'delivered',
                });
              }

              setNotificationLogs((prevLogs) => [...newEntries, ...prevLogs]);
            }

            return {
              ...rem,
              status: 'sent' as const,
              lastSentAt: new Date().toISOString(),
            };
          }
          return rem;
        });

        return hasChanges ? updated : prev;
      });
    };

    checkScheduledReminders();
    const interval = setInterval(checkScheduledReminders, 30000);
    return () => clearInterval(interval);
  }, [items]);

  // Persist RBAC data
  useEffect(() => {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (e) {}
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, currentUserRole);
    } catch (e) {}
  }, [currentUserRole]);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Could not persist to localStorage:', e);
    }
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(syncState));
    } catch (e) {}
  }, [syncState]);

  // Firestore connection validation on startup
  useEffect(() => {
    validateFirestoreConnection().then((connected) => {
      if (connected) {
        console.info('Connected to Firebase Firestore successfully.');
      }
    });
  }, []);

  // Real-time Firestore subscription for schedules
  useEffect(() => {
    const unsubscribe = subscribeToScheduleItems((remoteItems) => {
      if (remoteItems && remoteItems.length > 0) {
        setItems(remoteItems);
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser) => {
        setUser(currentUser);
      },
      () => {
        setUser(null);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleRestrictedAction = (action: PermissionAction) => {
    setAccessDeniedState({
      isOpen: true,
      action,
    });
  };

  const handleUpdateUserRole = (userId: string, newRole: UserRole) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
    const target = users.find((u) => u.id === userId);
    if (target && user?.email && target.email.toLowerCase() === user.email.toLowerCase()) {
      setCurrentUserRole(newRole);
    }
  };

  const handleAddUser = (name: string, email: string, role: UserRole) => {
    const newUser: AppUser = {
      id: `user-${Date.now()}`,
      name,
      email,
      role,
    };
    setUsers((prev) => [...prev, newUser]);
  };

  const handleSwitchRole = (role: UserRole) => {
    setCurrentUserRole(role);
  };

  // Auth Handlers
  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        // If the logged in user matches a known user profile, sync their role
        const matched = users.find(
          (u) => u.email.toLowerCase() === (res.user.email || '').toLowerCase()
        );
        if (matched) {
          setCurrentUserRole(matched.role);
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  // Task item interaction handlers with RBAC enforcement
  const handleToggleSubtask = (itemId: string, subtaskId: string) => {
    if (!hasPermission(currentUserRole, 'toggle_subtask')) {
      handleRestrictedAction('toggle_subtask');
      return;
    }

    setItems((prev) => {
      const updated = prev.map((item) => {
        if (item.id !== itemId) return item;

        const updatedSubtasks = item.subtasks.map((s) =>
          s.id === subtaskId ? { ...s, completed: !s.completed } : s
        );

        // Auto-calculate evaluation percentage based on completed subtasks
        const total = updatedSubtasks.length;
        const done = updatedSubtasks.filter((s) => s.completed).length;
        const newEvaluation = total > 0 ? Math.round((done / total) * 100) : item.evaluation;

        const updatedItem = {
          ...item,
          subtasks: updatedSubtasks,
          evaluation: newEvaluation,
          updatedAt: new Date().toISOString(),
        };

        // Fire-and-forget Firestore write
        saveScheduleItemToFirestore(updatedItem).catch(() => {});

        return updatedItem;
      });
      return updated;
    });
  };

  const handleUpdateEvaluation = (itemId: string, evaluation: number) => {
    if (!hasPermission(currentUserRole, 'update_evaluation')) {
      handleRestrictedAction('update_evaluation');
      return;
    }

    setItems((prev) => {
      const updated = prev.map((item) => {
        if (item.id !== itemId) return item;

        // If user marks 100%, auto-check all subtasks; if 0%, uncheck all
        let updatedSubtasks = item.subtasks;
        if (evaluation === 100) {
          updatedSubtasks = item.subtasks.map((s) => ({ ...s, completed: true }));
        } else if (evaluation === 0) {
          updatedSubtasks = item.subtasks.map((s) => ({ ...s, completed: false }));
        }

        const updatedItem = {
          ...item,
          evaluation,
          subtasks: updatedSubtasks,
          updatedAt: new Date().toISOString(),
        };

        saveScheduleItemToFirestore(updatedItem).catch(() => {});

        return updatedItem;
      });
      return updated;
    });
  };

  const handleAddSubtask = (itemId: string, text: string) => {
    if (!hasPermission(currentUserRole, 'add_subtask')) {
      handleRestrictedAction('add_subtask');
      return;
    }

    setItems((prev) => {
      const updated = prev.map((item) => {
        if (item.id !== itemId) return item;
        const newSub = {
          id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          text,
          completed: false,
        };
        const updatedSubtasks = [...item.subtasks, newSub];

        const updatedItem = {
          ...item,
          subtasks: updatedSubtasks,
          keyActivities: `${item.keyActivities}\n${text}`,
          updatedAt: new Date().toISOString(),
        };

        saveScheduleItemToFirestore(updatedItem).catch(() => {});

        return updatedItem;
      });
      return updated;
    });
  };

  const handleSaveTask = (taskData: Partial<ScheduleItem>) => {
    const actionRequired: PermissionAction = editingItem ? 'edit_task' : 'create_task';
    if (!hasPermission(currentUserRole, actionRequired)) {
      handleRestrictedAction(actionRequired);
      return;
    }

    if (editingItem) {
      const updatedItem: ScheduleItem = {
        ...editingItem,
        ...taskData,
        updatedAt: new Date().toISOString(),
      } as ScheduleItem;

      setItems((prev) =>
        prev.map((item) => (item.id === editingItem.id ? updatedItem : item))
      );
      saveScheduleItemToFirestore(updatedItem).catch(() => {});
      setEditingItem(null);
    } else {
      const newItem: ScheduleItem = {
        id: `sched-${Date.now()}`,
        day: taskData.day || 'Upcoming',
        responsible: taskData.responsible || 'Kibrom',
        keyActivities: taskData.keyActivities || '',
        subtasks: taskData.subtasks || [],
        evaluation: taskData.evaluation || 0,
        category: taskData.category || 'General',
        safetyNotes: taskData.safetyNotes || '',
        updatedAt: new Date().toISOString(),
      };
      setItems((prev) => [...prev, newItem]);
      saveScheduleItemToFirestore(newItem).catch(() => {});
    }
  };

  const handleDeleteItem = (item: ScheduleItem) => {
    if (!hasPermission(currentUserRole, 'delete_task')) {
      handleRestrictedAction('delete_task');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: `Delete '${item.day}' Milestone?`,
      message: `Are you sure you want to delete the schedule milestone for "${item.day}" (${item.responsible})? This will permanently remove all associated action items.`,
      confirmLabel: 'Delete Milestone',
      isDestructive: true,
      onConfirm: () => {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        deleteScheduleItemFromFirestore(item.id).catch(() => {});
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Google Sheets integration actions with RBAC enforcement
  const handleCreateNewSheet = async (title: string) => {
    if (!hasPermission(currentUserRole, 'sync_sheets')) {
      handleRestrictedAction('sync_sheets');
      return;
    }

    const result = await createScheduleSpreadsheet(title, items);
    setSyncState({
      spreadsheetId: result.spreadsheetId,
      spreadsheetUrl: result.spreadsheetUrl,
      spreadsheetTitle: title,
      lastSyncedAt: new Date().toISOString(),
      isSyncing: false,
    });
  };

  const handleUpdateExistingSheet = async () => {
    if (!hasPermission(currentUserRole, 'sync_sheets')) {
      handleRestrictedAction('sync_sheets');
      return;
    }

    if (!syncState.spreadsheetId) return;

    // MANDATORY confirmation dialog before mutating Google Sheets data
    setConfirmModal({
      isOpen: true,
      title: 'Update Google Sheet?',
      message: `You are about to sync and update ${items.length} schedule milestones to the connected Google Spreadsheet ("${
        syncState.spreadsheetTitle || 'Schedule Matrix'
      }"). Existing rows will be overwritten with the current schedule data.`,
      confirmLabel: 'Sync to Sheet',
      isDestructive: false,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        if (!syncState.spreadsheetId) return;
        await updateScheduleSpreadsheet(syncState.spreadsheetId, items);
        setSyncState((prev) => ({
          ...prev,
          lastSyncedAt: new Date().toISOString(),
        }));
      },
    });
  };

  const handleImportFromSheet = async (sheetId: string) => {
    if (!hasPermission(currentUserRole, 'import_sheets')) {
      handleRestrictedAction('import_sheets');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Import Schedule from Google Sheet?',
      message:
        'Loading data from this Google Sheet will replace the current schedule in your workspace. Do you want to proceed?',
      confirmLabel: 'Import & Replace',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        const importedItems = await fetchScheduleFromSpreadsheet(sheetId);
        setItems(importedItems);
        setSyncState((prev) => ({
          ...prev,
          spreadsheetId: sheetId,
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
          lastSyncedAt: new Date().toISOString(),
        }));
      },
    });
  };

  const handleExportCsv = () => {
    if (!hasPermission(currentUserRole, 'export_csv')) {
      handleRestrictedAction('export_csv');
      return;
    }
    exportToCsv(items);
  };

  const [isCsvImportModalOpen, setIsCsvImportModalOpen] = useState(false);

  const handleOpenImportCsv = () => {
    if (!hasPermission(currentUserRole, 'import_csv')) {
      handleRestrictedAction('import_csv');
      return;
    }
    setIsCsvImportModalOpen(true);
  };

  const handleImportCsvItems = (newItems: ScheduleItem[]) => {
    if (!hasPermission(currentUserRole, 'import_csv')) {
      handleRestrictedAction('import_csv');
      return;
    }
    setItems(newItems);
    batchSaveScheduleItemsToFirestore(newItems).catch(() => {});
  };

  // Notification and Reminder Handlers
  const handleOpenSetReminder = (task?: ScheduleItem) => {
    setReminderTargetTask(task || (items.length > 0 ? items[0] : null));
    setIsReminderModalOpen(true);
  };

  const handleSaveReminder = (reminderData: Omit<TaskReminder, 'id' | 'createdAt'>) => {
    if (!hasPermission(currentUserRole, 'set_reminder')) {
      handleRestrictedAction('set_reminder');
      return;
    }

    const newReminder: TaskReminder = {
      ...reminderData,
      id: `rem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };

    setReminders((prev) => [newReminder, ...prev]);

    // Optional native notification confirm
    triggerBrowserNotification(
      `Reminder Set: ${newReminder.taskDay}`,
      `Channel: ${newReminder.channel.toUpperCase()} | Notice: ${newReminder.leadTimeMinutes} min before`
    );
  };

  const handleToggleReminder = (reminderId: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === reminderId ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const handleDeleteReminder = (reminderId: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== reminderId));
  };

  const handleSendInstantNotification = async (
    taskId: string,
    channel: 'email' | 'sms' | 'telegram',
    recipient: string,
    customNotes?: string
  ) => {
    const item = items.find((i) => i.id === taskId);
    if (!item) return;

    let messageSummary = '';

    if (channel === 'telegram') {
      const result = await sendTelegramNotification(item, {
        recipient,
        customNotes,
      });
      messageSummary = result.message.slice(0, 160) + '...';
    } else if (channel === 'email') {
      const emailData = formatEmailNotification(item, customNotes);
      messageSummary = `${emailData.subject}\n\n${emailData.body.slice(0, 150)}...`;
    } else {
      const smsText = formatSmsNotification(item, customNotes);
      messageSummary = smsText;
    }

    const newLog: NotificationLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      taskId,
      taskTitle: `${item.day}: ${item.category} (${item.responsible})`,
      recipient,
      channel,
      message: messageSummary,
      sentAt: new Date().toISOString(),
      status: 'delivered',
    };

    setNotificationLogs((prev) => [newLog, ...prev]);

    // Trigger local push notification in browser
    triggerBrowserNotification(
      `[${channel.toUpperCase()} Dispatched] ${item.day} - ${item.category}`,
      `Recipient: ${recipient}\n${item.keyActivities.slice(0, 80)}`
    );
  };

  const handleRequestBrowserPermission = async () => {
    const granted = await requestBrowserNotificationPermission();
    setBrowserPermission(granted ? 'granted' : 'denied');
  };

  // Location Tagging Handler
  const handleTagLocationToTask = (
    taskId: string,
    locationData: { latitude: number; longitude: number; address?: string }
  ) => {
    if (!hasPermission(currentUserRole, 'tag_location')) {
      handleRestrictedAction('tag_location');
      return;
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== taskId) return item;
        const taskLoc: TaskLocation = {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          address: locationData.address,
          taggedAt: new Date().toISOString(),
        };
        return {
          ...item,
          location: taskLoc,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  // Filtering
  const filteredItems = items.filter((item) => {
    // Assignee filter
    if (selectedAssignee !== 'All') {
      if (selectedAssignee === 'Kibrom' && !item.responsible.includes('Kibrom')) return false;
      if (
        selectedAssignee === 'Assaye & Kibrom' &&
        (!item.responsible.includes('Assaye') || !item.responsible.includes('Kibrom'))
      )
        return false;
      if (selectedAssignee === 'Assaye' && !item.responsible.includes('Assaye')) return false;
    }

    // Status filter
    if (selectedStatus === 'pending' && item.evaluation !== 0) return false;
    if (selectedStatus === 'in_progress' && (item.evaluation === 0 || item.evaluation === 100))
      return false;
    if (selectedStatus === 'completed' && item.evaluation !== 100) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDay = item.day.toLowerCase().includes(q);
      const matchResp = item.responsible.toLowerCase().includes(q);
      const matchAct = item.keyActivities.toLowerCase().includes(q);
      const matchSubs = item.subtasks.some((s) => s.text.toLowerCase().includes(q));
      const matchCat = item.category.toLowerCase().includes(q);
      if (!matchDay && !matchResp && !matchAct && !matchSubs && !matchCat) return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col">
      {/* Header */}
      <Header
        user={user}
        isLoggingIn={isLoggingIn}
        onLogin={handleLogin}
        onLogout={handleLogout}
        syncState={syncState}
        currentUserRole={currentUserRole}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onOpenRbacModal={() => setIsRbacModalOpen(true)}
        onSwitchRole={handleSwitchRole}
        onExportCsv={handleExportCsv}
        onImportCsv={handleOpenImportCsv}
        onOpenAddModal={() => {
          if (!hasPermission(currentUserRole, 'create_task')) {
            handleRestrictedAction('create_task');
            return;
          }
          setEditingItem(null);
          setIsTaskModalOpen(true);
        }}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        dueTodayCount={tasksDueToday.length}
        onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
        onOpenLiveLocation={() => setIsLiveLocationModalOpen(true)}
        unreadChatCount={unreadChatCount}
        onOpenChat={() => {
          setIsChatDrawerOpen(true);
          setUnreadChatCount(0);
        }}
        onOpenGemini={() => setIsGeminiCopilotOpen(true)}
        onOpenCalendarExport={() => handleOpenCalendarExport()}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* KPI & Summary Metrics Bar */}
        <SummaryStats
          items={items}
          selectedAssignee={selectedAssignee}
          onSelectAssignee={setSelectedAssignee}
          selectedStatus={selectedStatus}
          onSelectStatus={setSelectedStatus}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenGemini={() => setIsGeminiCopilotOpen(true)}
        />

        {/* Dynamic Views */}
        {viewMode === 'table' && (
          <ScheduleTable
            items={filteredItems}
            currentUserRole={currentUserRole}
            onToggleSubtask={handleToggleSubtask}
            onUpdateEvaluation={handleUpdateEvaluation}
            onEditItem={(item) => {
              setEditingItem(item);
              setIsTaskModalOpen(true);
            }}
            onDeleteItem={handleDeleteItem}
            onAddSubtask={handleAddSubtask}
            onRestrictedAction={handleRestrictedAction}
            onSetReminder={(item) => handleOpenSetReminder(item)}
            onViewLocation={(item) => {
              setIsLiveLocationModalOpen(true);
            }}
            onChatTask={(item) => handleOpenChatWithTask(item)}
            onExportCalendar={(item) => handleOpenCalendarExport(item)}
            onSendTelegram={(item) =>
              handleSendInstantNotification(
                item.id,
                'telegram',
                '@kibrom',
                'Schedule update and milestone review'
              )
            }
          />
        )}

        {viewMode === 'timeline' && (
          <TimelineCards
            items={filteredItems}
            currentUserRole={currentUserRole}
            onToggleSubtask={handleToggleSubtask}
            onUpdateEvaluation={handleUpdateEvaluation}
            onEditItem={(item) => {
              setEditingItem(item);
              setIsTaskModalOpen(true);
            }}
            onDeleteItem={handleDeleteItem}
            onRestrictedAction={handleRestrictedAction}
            onSetReminder={(item) => handleOpenSetReminder(item)}
            onViewLocation={(item) => {
              setIsLiveLocationModalOpen(true);
            }}
            onChatTask={(item) => handleOpenChatWithTask(item)}
            onExportCalendar={(item) => handleOpenCalendarExport(item)}
            onSendTelegram={(item) =>
              handleSendInstantNotification(
                item.id,
                'telegram',
                '@kibrom',
                'Schedule update and milestone review'
              )
            }
          />
        )}

        {viewMode === 'analytics' && <AnalyticsView items={items} />}
      </main>

      {/* Task Create/Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        item={editingItem}
        currentUserRole={currentUserRole}
        onSave={handleSaveTask}
        onExportToCalendar={(item) => handleOpenCalendarExport(item)}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingItem(null);
        }}
      />

      {/* Google Sheets Sync Modal */}
      <SheetsSyncModal
        isOpen={isSyncModalOpen}
        user={user}
        syncState={syncState}
        items={items}
        currentUserRole={currentUserRole}
        onClose={() => setIsSyncModalOpen(false)}
        onLogin={handleLogin}
        onCreateNewSheet={handleCreateNewSheet}
        onUpdateExistingSheet={handleUpdateExistingSheet}
        onImportFromSheet={handleImportFromSheet}
        onRestrictedAction={handleRestrictedAction}
      />

      {/* RBAC Role & Permissions Management Modal */}
      <RbacManagementModal
        isOpen={isRbacModalOpen}
        currentUserRole={currentUserRole}
        users={users}
        onClose={() => setIsRbacModalOpen(false)}
        onUpdateUserRole={handleUpdateUserRole}
        onAddUser={handleAddUser}
        onSwitchRole={handleSwitchRole}
      />

      {/* Access Denied / Permission Warning Modal */}
      <AccessDeniedModal
        isOpen={accessDeniedState.isOpen}
        action={accessDeniedState.action}
        userRole={currentUserRole}
        onClose={() => setAccessDeniedState({ isOpen: false, action: null })}
        onRequestElevate={() => {
          setAccessDeniedState({ isOpen: false, action: null });
          setIsRbacModalOpen(true);
        }}
      />

      {/* Notification Drawer (Tasks Due Today, Reminders, Sent History) */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        tasksDueToday={tasksDueToday}
        allTasks={items}
        reminders={reminders}
        logs={notificationLogs}
        currentUserRole={currentUserRole}
        onOpenSetReminder={(task) => {
          handleOpenSetReminder(task);
        }}
        onToggleReminder={handleToggleReminder}
        onDeleteReminder={handleDeleteReminder}
        onSendInstantNotification={handleSendInstantNotification}
        onRequestBrowserPermission={handleRequestBrowserPermission}
        browserPermission={browserPermission}
      />

      {/* Task Reminder Scheduling Modal */}
      <TaskReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => {
          setIsReminderModalOpen(false);
          setReminderTargetTask(null);
        }}
        tasks={items}
        initialTask={reminderTargetTask}
        onSaveReminder={handleSaveReminder}
        onSendInstantNotification={handleSendInstantNotification}
      />

      {/* Real-time GPS Live Location Modal with Interactive Map */}
      <LiveLocationModal
        isOpen={isLiveLocationModalOpen}
        onClose={() => setIsLiveLocationModalOpen(false)}
        tasks={items}
        currentUserRole={currentUserRole}
        onTagLocationToTask={handleTagLocationToTask}
      />

      {/* Real-time Team & Friends Chat Drawer */}
      <ChatDrawer
        isOpen={isChatDrawerOpen}
        onClose={() => setIsChatDrawerOpen(false)}
        user={user}
        currentUserRole={currentUserRole}
        tasks={items}
        initialChannelId={chatTargetChannelId}
        initialTask={chatTargetTask}
        onSelectTask={(task) => {
          setEditingItem(task);
          setIsTaskModalOpen(true);
        }}
      />

      {/* Floating Chat Box Widget */}
      <FloatingChatWidget
        isOpen={isChatDrawerOpen}
        unreadCount={unreadChatCount}
        onOpenChat={() => handleOpenChatWithTask()}
      />

      {/* Gemini Schedule Copilot & Feasibility Advisor */}
      <GeminiScheduleCopilot
        isOpen={isGeminiCopilotOpen}
        onClose={() => setIsGeminiCopilotOpen(false)}
        tasks={items}
        onOpenChatWithAdvice={(text) => {
          setIsGeminiCopilotOpen(false);
          setIsChatDrawerOpen(true);
        }}
      />

      {/* Google Calendar Milestone Export Modal */}
      <CalendarExportModal
        isOpen={isCalendarModalOpen}
        onClose={() => {
          setIsCalendarModalOpen(false);
          setCalendarItemToExport(null);
        }}
        items={items}
        user={user}
        onLogin={handleLogin}
        singleItemToExport={calendarItemToExport}
      />

      {/* CSV File Import & Replace Modal */}
      <CsvImportModal
        isOpen={isCsvImportModalOpen}
        onClose={() => setIsCsvImportModalOpen(false)}
        onImportItems={handleImportCsvItems}
        currentUserRole={currentUserRole}
        currentItemsCount={items.length}
        onRestrictedAction={() => handleRestrictedAction('import_csv')}
      />

      {/* Mandatory User Confirmation Modal for Destructive Operations */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        isDestructive={confirmModal.isDestructive}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
