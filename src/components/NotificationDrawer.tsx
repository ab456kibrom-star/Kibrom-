import React, { useState } from 'react';
import {
  Bell,
  Mail,
  MessageSquare,
  Clock,
  CheckCircle,
  X,
  Plus,
  Send,
  Trash2,
  AlertTriangle,
  ExternalLink,
  Smartphone,
  ShieldCheck,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { ScheduleItem, TaskReminder, NotificationLog, UserRole } from '../types';
import { formatEmailNotification, formatSmsNotification, triggerBrowserNotification } from '../services/notifications';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tasksDueToday: ScheduleItem[];
  allTasks: ScheduleItem[];
  reminders: TaskReminder[];
  logs: NotificationLog[];
  currentUserRole: UserRole;
  onOpenSetReminder: (task?: ScheduleItem) => void;
  onToggleReminder: (reminderId: string) => void;
  onDeleteReminder: (reminderId: string) => void;
  onSendInstantNotification: (
    taskId: string,
    channel: 'email' | 'sms' | 'telegram',
    recipient: string,
    customNotes?: string
  ) => void;
  onRequestBrowserPermission: () => void;
  browserPermission: NotificationPermission | 'unsupported';
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  tasksDueToday,
  allTasks,
  reminders,
  logs,
  currentUserRole,
  onOpenSetReminder,
  onToggleReminder,
  onDeleteReminder,
  onSendInstantNotification,
  onRequestBrowserPermission,
  browserPermission,
}) => {
  const [activeTab, setActiveTab] = useState<'today' | 'reminders' | 'logs'>('today');
  const [previewLog, setPreviewLog] = useState<NotificationLog | null>(null);

  if (!isOpen) return null;

  const todayDateFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
                  <span>Task Notifications</span>
                  {tasksDueToday.length > 0 && (
                    <span className="px-2 py-0.5 text-xs font-semibold bg-rose-500 text-white rounded-full">
                      {tasksDueToday.length} Due Today
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-400">{todayDateFormatted}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Browser Notification Banner if not granted */}
          {browserPermission === 'default' && (
            <div className="bg-indigo-50 border-b border-indigo-100 p-3 flex items-center justify-between gap-3 text-xs text-indigo-900">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Enable browser push alerts for scheduled milestones</span>
              </div>
              <button
                type="button"
                onClick={onRequestBrowserPermission}
                className="px-2.5 py-1 bg-indigo-600 text-white font-medium rounded hover:bg-indigo-700 transition-colors shrink-0"
              >
                Enable
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setActiveTab('today')}
              className={`flex-1 py-2.5 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'today'
                  ? 'border-slate-900 text-slate-900 font-semibold bg-white'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              <span>Due Today</span>
              <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-full text-[10px] font-bold">
                {tasksDueToday.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('reminders')}
              className={`flex-1 py-2.5 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'reminders'
                  ? 'border-slate-900 text-slate-900 font-semibold bg-white'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              <span>Scheduled Rules</span>
              <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-full text-[10px] font-bold">
                {reminders.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('logs')}
              className={`flex-1 py-2.5 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'logs'
                  ? 'border-slate-900 text-slate-900 font-semibold bg-white'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              <span>Sent History</span>
              <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-full text-[10px] font-bold">
                {logs.length}
              </span>
            </button>
          </div>

          {/* Tab 1: Tasks Due Today */}
          {activeTab === 'today' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {tasksDueToday.length === 0 ? (
                <div className="text-center py-10 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="text-sm font-semibold text-slate-800">All clear for today!</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    No tasks or maintenance milestones scheduled for today ({todayDateFormatted}).
                  </p>
                  <button
                    type="button"
                    onClick={() => onOpenSetReminder()}
                    className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Set Reminder for Any Task</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                    <span>{tasksDueToday.length} milestone(s) require attention today:</span>
                    <button
                      type="button"
                      onClick={() => onOpenSetReminder()}
                      className="text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add Reminder
                    </button>
                  </div>

                  {tasksDueToday.map((task) => {
                    const taskReminders = reminders.filter((r) => r.taskId === task.id);
                    return (
                      <div
                        key={task.id}
                        className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs hover:border-slate-300 transition-all space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 mb-1">
                              {task.day} • {task.category}
                            </span>
                            <h3 className="text-sm font-bold text-slate-900 leading-snug">
                              {task.responsible}
                            </h3>
                          </div>
                          <div className="text-right">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                                task.evaluation === 100
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : task.evaluation > 0
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {task.evaluation}% Done
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {task.keyActivities}
                        </p>

                        {task.safetyNotes && (
                          <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded p-1.5 flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{task.safetyNotes}</span>
                          </div>
                        )}

                        {/* Quick action buttons for Telegram, Email, and Phone Text */}
                        <div className="pt-1 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() =>
                                onSendInstantNotification(
                                  task.id,
                                  'telegram',
                                  '@kibrom',
                                  'Task is due today! Please review priority activities.'
                                )
                              }
                              title="Send Task Message by Telegram to Kibrom"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 rounded-md transition-colors"
                            >
                              <Send className="w-3 h-3 text-sky-500" />
                              <span>Telegram</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                onSendInstantNotification(
                                  task.id,
                                  'email',
                                  'ab456kibrom@gmail.com',
                                  'Task is due today! Please review priority activities.'
                                )
                              }
                              title="Send Email Alert to Kibrom"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
                            >
                              <Mail className="w-3 h-3 text-emerald-600" />
                              <span>Email</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                onSendInstantNotification(
                                  task.id,
                                  'sms',
                                  '+1 (555) 019-2834',
                                  'Task due today: ' + task.keyActivities.slice(0, 50)
                                )
                              }
                              title="Send SMS / Text Message to Phone"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
                            >
                              <Smartphone className="w-3 h-3 text-blue-600" />
                              <span>SMS</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => onOpenSetReminder(task)}
                            title="Configure custom reminder schedule"
                            className="p-1 text-slate-400 hover:text-slate-800 rounded hover:bg-slate-100 shrink-0"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* Tab 2: Scheduled Reminders */}
          {activeTab === 'reminders' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">
                  {reminders.length} automated notification rule(s)
                </span>
                <button
                  type="button"
                  onClick={() => onOpenSetReminder()}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Reminder</span>
                </button>
              </div>

              {reminders.length === 0 ? (
                <div className="text-center py-12 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Clock className="w-9 h-9 text-slate-400 mx-auto mb-2 opacity-60" />
                  <p className="text-sm font-semibold text-slate-800">No scheduled reminders</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Set up automated email and SMS text alerts for your upcoming tasks.
                  </p>
                  <button
                    type="button"
                    onClick={() => onOpenSetReminder()}
                    className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Task Reminder</span>
                  </button>
                </div>
              ) : (
                reminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-2 hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              reminder.channel === 'email'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : reminder.channel === 'sms'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}
                          >
                            {reminder.channel === 'email' && <Mail className="w-3 h-3" />}
                            {reminder.channel === 'sms' && <Smartphone className="w-3 h-3" />}
                            {reminder.channel === 'both' && (
                              <>
                                <Mail className="w-2.5 h-2.5" />
                                <Smartphone className="w-2.5 h-2.5" />
                              </>
                            )}
                            <span className="capitalize">{reminder.channel} Alert</span>
                          </span>

                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              reminder.enabled
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {reminder.enabled ? 'Active' : 'Disabled'}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 mt-1">
                          {reminder.taskDay} • {reminder.taskTitle}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onToggleReminder(reminder.id)}
                          title={reminder.enabled ? 'Disable reminder' : 'Enable reminder'}
                          className={`text-xs px-2 py-1 rounded font-medium border transition-colors ${
                            reminder.enabled
                              ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {reminder.enabled ? 'Pause' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteReminder(reminder.id)}
                          title="Delete reminder rule"
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 space-y-0.5">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Scheduled: {reminder.reminderDateTime.replace('T', ' ')}</span>
                      </div>
                      {reminder.recipientTelegram && (
                        <div className="flex items-center gap-1">
                          <Send className="w-3 h-3 text-sky-500" />
                          <span className="text-sky-700 font-medium">Telegram: {reminder.recipientTelegram}</span>
                        </div>
                      )}
                      {reminder.recipientEmail && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[240px]">{reminder.recipientEmail}</span>
                        </div>
                      )}
                      {reminder.recipientPhone && (
                        <div className="flex items-center gap-1">
                          <Smartphone className="w-3 h-3 text-slate-400" />
                          <span>{reminder.recipientPhone}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">
                        {reminder.lastSentAt
                          ? `Last dispatched: ${new Date(reminder.lastSentAt).toLocaleTimeString()}`
                          : 'Pending dispatch'}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onSendInstantNotification(
                            reminder.taskId,
                            reminder.channel === 'telegram'
                              ? 'telegram'
                              : reminder.channel === 'sms'
                              ? 'sms'
                              : reminder.channel === 'all'
                              ? 'telegram'
                              : 'email',
                            reminder.channel === 'telegram' || reminder.channel === 'all'
                              ? reminder.recipientTelegram || '@kibrom'
                              : reminder.channel === 'sms'
                              ? reminder.recipientPhone
                              : reminder.recipientEmail,
                            reminder.customNotes
                          )
                        }
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        <Send className="w-2.5 h-2.5" />
                        <span>Send Test Now</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 3: Sent History Logs */}
          {activeTab === 'logs' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Dispatch History ({logs.length})</span>
                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-mono">
                  Telegram, Email & SMS logs
                </span>
              </div>

              {logs.length === 0 ? (
                <div className="text-center py-12 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Send className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
                  <p className="text-sm font-semibold text-slate-800">No sent notifications yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    When notifications are triggered or tested via Telegram, Email, or SMS, their delivery logs will appear here.
                  </p>
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    onClick={() => setPreviewLog(log)}
                    className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs hover:border-indigo-300 cursor-pointer transition-all space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {log.channel === 'telegram' ? (
                          <span className="p-1 rounded bg-sky-50 text-sky-600">
                            <Send className="w-3 h-3" />
                          </span>
                        ) : log.channel === 'email' ? (
                          <span className="p-1 rounded bg-emerald-50 text-emerald-700">
                            <Mail className="w-3 h-3" />
                          </span>
                        ) : (
                          <span className="p-1 rounded bg-blue-50 text-blue-700">
                            <Smartphone className="w-3 h-3" />
                          </span>
                        )}
                        <span className="text-xs font-bold text-slate-900 truncate max-w-[180px]">
                          {log.taskTitle}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.sentAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 truncate flex items-center justify-between">
                      <div>
                        To: <span className="font-semibold text-slate-800">{log.recipient}</span>
                      </div>
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded ${
                        log.channel === 'telegram'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : log.channel === 'email'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {log.channel}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 line-clamp-1 italic">
                      "{log.message}"
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[10px]">
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                        <CheckCircle className="w-3 h-3" />
                        Dispatched
                      </span>
                      <span className="text-indigo-600 hover:underline">View details →</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Log Preview Modal / Overlay */}
          {previewLog && (
            <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between font-bold text-slate-900">
                <span>Dispatched Notification Preview</span>
                <button
                  type="button"
                  onClick={() => setPreviewLog(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="bg-white p-2.5 rounded border border-slate-200 space-y-1 font-mono text-[11px]">
                <div>Channel: {previewLog.channel.toUpperCase()}</div>
                <div>To: {previewLog.recipient}</div>
                <div>Time: {new Date(previewLog.sentAt).toLocaleString()}</div>
                <div className="pt-1 border-t border-slate-100 whitespace-pre-wrap text-slate-700 font-sans">
                  {previewLog.message}
                </div>
              </div>
            </div>
          )}

          {/* Drawer Footer Actions */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onOpenSetReminder()}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Task Reminder</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
