import React from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Edit3,
  Trash2,
  ShieldAlert,
  Lock,
  Bell,
  MapPin,
  MessageSquare,
  Send,
  Calendar,
} from 'lucide-react';
import { ScheduleItem, UserRole, PermissionAction } from '../types';

interface TimelineCardsProps {
  items: ScheduleItem[];
  currentUserRole: UserRole;
  onToggleSubtask: (itemId: string, subtaskId: string) => void;
  onUpdateEvaluation: (itemId: string, evaluation: number) => void;
  onEditItem: (item: ScheduleItem) => void;
  onDeleteItem: (item: ScheduleItem) => void;
  onRestrictedAction: (action: PermissionAction) => void;
  onSetReminder?: (item: ScheduleItem) => void;
  onViewLocation?: (item: ScheduleItem) => void;
  onChatTask?: (item: ScheduleItem) => void;
  onSendTelegram?: (item: ScheduleItem) => void;
  onExportCalendar?: (item: ScheduleItem) => void;
}

export const TimelineCards: React.FC<TimelineCardsProps> = ({
  items,
  currentUserRole,
  onToggleSubtask,
  onUpdateEvaluation,
  onEditItem,
  onDeleteItem,
  onRestrictedAction,
  onSetReminder,
  onViewLocation,
  onChatTask,
  onSendTelegram,
  onExportCalendar,
}) => {
  const isViewer = currentUserRole === 'Viewer';
  const isAdmin = currentUserRole === 'Admin';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {items.map((item, index) => {
        const completedCount = item.subtasks.filter((s) => s.completed).length;
        const totalCount = item.subtasks.length;
        const isDone = item.evaluation === 100;

        return (
          <div
            key={item.id}
            className={`bg-white border rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between ${
              isDone
                ? 'border-emerald-200 ring-1 ring-emerald-100'
                : 'border-slate-200'
            }`}
          >
            {/* Card Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </span>
                  <h3 className="font-bold text-slate-900 text-base">{item.day}</h3>
                </div>
                <div className="flex items-center gap-1">
                  {/* Send message by Telegram */}
                  <button
                    type="button"
                    onClick={() => onSendTelegram?.(item)}
                    title="Send milestone details by Telegram"
                    className="p-1 text-slate-400 hover:text-sky-600 rounded transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>

                  {/* Chat about milestone with friends */}
                  <button
                    type="button"
                    onClick={() => onChatTask?.(item)}
                    title="Chat about this milestone with friends & team"
                    className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>

                  {/* Reminder button */}
                  <button
                    type="button"
                    onClick={() => onSetReminder?.(item)}
                    title="Set Email / SMS Reminder"
                    className="p-1 text-slate-400 hover:text-amber-600 rounded transition-colors"
                  >
                    <Bell className="w-3.5 h-3.5" />
                  </button>

                  {/* Location button */}
                  <button
                    type="button"
                    onClick={() => onViewLocation?.(item)}
                    title={item.location ? 'View pinned GPS location' : 'Pin live GPS location'}
                    className={`p-1 rounded transition-colors ${
                      item.location
                        ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                        : 'text-slate-400 hover:text-emerald-600'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                  </button>

                  {/* Calendar export button */}
                  <button
                    type="button"
                    onClick={() => onExportCalendar?.(item)}
                    title="Push milestone to Google Calendar"
                    className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                  </button>

                  {isViewer ? (
                    <button
                      type="button"
                      onClick={() => onRestrictedAction('edit_task')}
                      title="Editing requires Editor or Admin role"
                      className="p-1 text-slate-300 hover:text-slate-500 rounded transition-colors"
                    >
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onEditItem(item)}
                      title="Edit Task"
                      className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => onDeleteItem(item)}
                      title="Delete Task (Admin)"
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onRestrictedAction('delete_task')}
                      title="Deleting milestones is restricted to Admin role"
                      className="p-1 text-slate-300 hover:text-slate-400 rounded transition-colors cursor-not-allowed"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-slate-300" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-medium text-slate-700">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{item.responsible}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-slate-200 text-slate-700">
                  {item.category}
                </span>
              </div>
            </div>

            {/* Subtasks List */}
            <div className="p-4 flex-1 space-y-2.5">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Action Items ({completedCount}/{totalCount})
              </div>
              <div className="space-y-2">
                {item.subtasks.map((sub) => (
                  <label
                    key={sub.id}
                    onClick={(e) => {
                      if (isViewer) {
                        e.preventDefault();
                        onRestrictedAction('toggle_subtask');
                      }
                    }}
                    className={`flex items-start gap-2.5 p-2 rounded-lg transition-colors text-xs leading-relaxed ${
                      isViewer ? 'cursor-not-allowed opacity-85' : 'cursor-pointer'
                    } ${
                      sub.completed
                        ? 'bg-emerald-50/60 text-slate-400 line-through'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
                    }`}
                    title={isViewer ? 'Read-only: requires Editor or Admin role' : undefined}
                  >
                    <input
                      type="checkbox"
                      checked={sub.completed}
                      disabled={isViewer}
                      onChange={() => {
                        if (!isViewer) {
                          onToggleSubtask(item.id, sub.id);
                        }
                      }}
                      className={`mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 ${
                        isViewer ? 'cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    />
                    <span className="select-none font-medium">{sub.text}</span>
                  </label>
                ))}
              </div>

              {/* Safety notice if any */}
              {item.safetyNotes && (
                <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Safety Note:</span>
                    <span>{item.safetyNotes}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer / Evaluation Progress */}
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-700">Evaluation</span>
                <span className="font-bold text-indigo-700">{item.evaluation}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mb-3">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isDone ? 'bg-emerald-500' : 'bg-indigo-600'
                  }`}
                  style={{ width: `${item.evaluation}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between gap-1">
                {[0, 25, 50, 75, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      if (isViewer) {
                        onRestrictedAction('update_evaluation');
                      } else {
                        onUpdateEvaluation(item.id, preset);
                      }
                    }}
                    className={`flex-1 py-1 text-[10px] rounded font-semibold transition-all ${
                      isViewer
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : item.evaluation === preset
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                    title={isViewer ? 'Read-only: Updating evaluation requires Editor or Admin' : undefined}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

