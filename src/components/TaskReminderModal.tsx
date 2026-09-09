import React, { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  Smartphone,
  Calendar,
  Clock,
  Send,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  Info,
  Share2,
} from 'lucide-react';
import { ScheduleItem, TaskReminder, NotificationChannel } from '../types';
import {
  formatEmailNotification,
  formatSmsNotification,
  formatTelegramNotification,
  sendTelegramNotification,
} from '../services/notifications';

interface TaskReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: ScheduleItem[];
  initialTask?: ScheduleItem | null;
  onSaveReminder: (reminder: Omit<TaskReminder, 'id' | 'createdAt'>) => void;
  onSendInstantNotification: (
    taskId: string,
    channel: 'email' | 'sms' | 'telegram',
    recipient: string,
    customNotes?: string
  ) => void;
}

export const TaskReminderModal: React.FC<TaskReminderModalProps> = ({
  isOpen,
  onClose,
  tasks,
  initialTask,
  onSaveReminder,
  onSendInstantNotification,
}) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [channel, setChannel] = useState<NotificationChannel>('telegram');
  const [recipientEmail, setRecipientEmail] = useState<string>('ab456kibrom@gmail.com');
  const [recipientPhone, setRecipientPhone] = useState<string>('+1 (555) 019-2834');
  const [recipientTelegram, setRecipientTelegram] = useState<string>('@kibrom');
  const [reminderDateTime, setReminderDateTime] = useState<string>('');
  const [leadTimeMinutes, setLeadTimeMinutes] = useState<number>(60);
  const [customNotes, setCustomNotes] = useState<string>('');
  const [previewTab, setPreviewTab] = useState<'telegram' | 'email' | 'sms'>('telegram');
  const [testSentFeedback, setTestSentFeedback] = useState<string | null>(null);

  // Initialize form state
  useEffect(() => {
    if (isOpen) {
      if (initialTask) {
        setSelectedTaskId(initialTask.id);
        if (initialTask.responsible.includes('Kibrom')) {
          setRecipientEmail('ab456kibrom@gmail.com');
          setRecipientTelegram('@kibrom');
        } else if (initialTask.responsible.includes('Assaye')) {
          setRecipientEmail('assaye.maintenance@example.com');
          setRecipientTelegram('@assaye_team');
        }
      } else if (tasks.length > 0) {
        setSelectedTaskId(tasks[0].id);
      }

      // Default reminder date-time to today at 08:00 or current hour + 1
      const now = new Date();
      now.setHours(now.getHours() + 1, 0, 0, 0);
      const tzOffset = now.getTimezoneOffset() * 60000;
      const localISOTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
      setReminderDateTime(localISOTime);
      setTestSentFeedback(null);
    }
  }, [isOpen, initialTask, tasks]);

  if (!isOpen) return null;

  const currentTask = tasks.find((t) => t.id === selectedTaskId) || tasks[0];

  const emailPreview = currentTask ? formatEmailNotification(currentTask, customNotes) : null;
  const smsPreview = currentTask ? formatSmsNotification(currentTask, customNotes) : '';
  const telegramPreview = currentTask ? formatTelegramNotification(currentTask, customNotes) : '';

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTask) return;

    onSaveReminder({
      taskId: currentTask.id,
      taskTitle: currentTask.category + ' - ' + currentTask.responsible,
      taskDay: currentTask.day,
      channel,
      recipientEmail,
      recipientPhone,
      recipientTelegram,
      reminderDateTime,
      leadTimeMinutes,
      customNotes,
      enabled: true,
      status: 'pending',
    });

    onClose();
  };

  const handleSendTest = () => {
    if (!currentTask) return;

    if (channel === 'telegram' || channel === 'all') {
      onSendInstantNotification(currentTask.id, 'telegram', recipientTelegram, customNotes);
    }
    if (channel === 'email' || channel === 'both' || channel === 'all') {
      onSendInstantNotification(currentTask.id, 'email', recipientEmail, customNotes);
    }
    if (channel === 'sms' || channel === 'both' || channel === 'all') {
      onSendInstantNotification(currentTask.id, 'sms', recipientPhone, customNotes);
    }

    const channelLabel =
      channel === 'telegram'
        ? 'Telegram'
        : channel === 'all'
        ? 'Telegram, Email & SMS'
        : channel === 'both'
        ? 'Email & SMS'
        : channel.toUpperCase();

    setTestSentFeedback(`Test message dispatched via ${channelLabel} successfully!`);
    setTimeout(() => setTestSentFeedback(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Set Notification Reminder</h2>
              <p className="text-xs text-slate-400">
                Automated Email & SMS text alerts for scheduled maintenance tasks
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback alert */}
        {testSentFeedback && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center gap-2 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{testSentFeedback}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="p-6 space-y-4">
          {/* Target Task Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Scheduled Task
            </label>
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.day} — {task.responsible} ({task.category}) [{task.evaluation}% done]
                </option>
              ))}
            </select>
          </div>

          {/* Delivery Channel Radio/Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Notification Channel
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  setChannel('telegram');
                  setPreviewTab('telegram');
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                  channel === 'telegram'
                    ? 'bg-sky-500 text-white border-sky-500 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Telegram</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setChannel('email');
                  setPreviewTab('email');
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                  channel === 'email'
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email Only</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setChannel('sms');
                  setPreviewTab('sms');
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                  channel === 'sms'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Phone SMS</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setChannel('all');
                  setPreviewTab('telegram');
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                  channel === 'all' || channel === 'both'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>All Channels</span>
              </button>
            </div>
          </div>

          {/* Contact Details Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(channel === 'telegram' || channel === 'all') && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Send className="w-3.5 h-3.5 text-sky-500" />
                  <span>Telegram Recipient / Chat</span>
                </label>
                <input
                  type="text"
                  required
                  value={recipientTelegram}
                  onChange={(e) => setRecipientTelegram(e.target.value)}
                  placeholder="@kibrom or Chat ID"
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            )}

            {(channel === 'email' || channel === 'both' || channel === 'all') && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>Recipient Email</span>
                </label>
                <input
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="e.g. ab456kibrom@gmail.com"
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            )}

            {(channel === 'sms' || channel === 'both' || channel === 'all') && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                  <span>Phone for Text / SMS</span>
                </label>
                <input
                  type="tel"
                  required
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="+1 (555) 019-2834"
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            )}
          </div>

          {/* Timing and Lead Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Trigger Date & Time</span>
              </label>
              <input
                type="datetime-local"
                required
                value={reminderDateTime}
                onChange={(e) => setReminderDateTime(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Advance Lead Notice</span>
              </label>
              <select
                value={leadTimeMinutes}
                onChange={(e) => setLeadTimeMinutes(Number(e.target.value))}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value={0}>At scheduled time</option>
                <option value={15}>15 minutes before</option>
                <option value={60}>1 hour before</option>
                <option value={180}>3 hours before</option>
                <option value={1440}>1 day before (24 hours)</option>
              </select>
            </div>
          </div>

          {/* Custom Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Custom Reminder Notes (Optional)
            </label>
            <input
              type="text"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="e.g. Bring replacement rubber gaskets and sealant"
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Live Message Preview Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                Message Dispatch Preview
              </span>
              <div className="flex gap-1">
                {(channel === 'telegram' || channel === 'all') && (
                  <button
                    type="button"
                    onClick={() => setPreviewTab('telegram')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 ${
                      previewTab === 'telegram'
                        ? 'bg-sky-500 text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Send className="w-2.5 h-2.5" />
                    <span>Telegram</span>
                  </button>
                )}
                {(channel === 'email' || channel === 'both' || channel === 'all') && (
                  <button
                    type="button"
                    onClick={() => setPreviewTab('email')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      previewTab === 'email'
                        ? 'bg-white text-slate-900 shadow-2xs border border-slate-300'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Email Format
                  </button>
                )}
                {(channel === 'sms' || channel === 'both' || channel === 'all') && (
                  <button
                    type="button"
                    onClick={() => setPreviewTab('sms')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      previewTab === 'sms'
                        ? 'bg-white text-slate-900 shadow-2xs border border-slate-300'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    SMS Format
                  </button>
                )}
              </div>
            </div>

            {previewTab === 'telegram' ? (
              <div className="bg-sky-50/70 border border-sky-200/80 rounded-lg p-2.5 text-xs font-sans text-slate-800">
                <div className="flex items-center justify-between text-[11px] text-sky-800 font-bold mb-1.5 pb-1 border-b border-sky-200/60">
                  <span className="flex items-center gap-1">
                    <Send className="w-3 h-3 text-sky-600" />
                    <span>Telegram Rich Format Alert</span>
                  </span>
                  <span className="text-[10px] font-mono text-sky-700">Markdown + Direct App Link</span>
                </div>
                <div className="text-slate-700 whitespace-pre-wrap font-sans text-xs leading-relaxed max-h-36 overflow-y-auto bg-white/80 p-2 rounded border border-sky-100">
                  {telegramPreview}
                </div>
              </div>
            ) : previewTab === 'email' && emailPreview ? (
              <div className="space-y-1 font-mono text-[11px] bg-white p-2.5 rounded border border-slate-200">
                <div className="font-bold text-slate-900">{emailPreview.subject}</div>
                <div className="text-slate-600 whitespace-pre-wrap font-sans text-xs pt-1 border-t border-slate-100 max-h-32 overflow-y-auto">
                  {emailPreview.body}
                </div>
              </div>
            ) : (
              <div className="bg-white p-2.5 rounded border border-slate-200 text-xs font-sans text-slate-800">
                <div className="text-[10px] text-slate-400 font-mono mb-1">
                  SMS Character count: {smsPreview.length}/160
                </div>
                <p className="bg-blue-50/60 p-2 rounded border border-blue-100 text-blue-950 font-medium">
                  {smsPreview}
                </p>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleSendTest}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Test Now</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
              >
                Schedule Reminder
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
