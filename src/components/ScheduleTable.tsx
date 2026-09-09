import React, { useState } from 'react';
import {
  Edit3,
  Trash2,
  AlertCircle,
  Plus,
  Shield,
  Clock,
  Sparkles,
  Lock,
  Bell,
  MapPin,
  MessageSquare,
  Send,
  Calendar,
} from 'lucide-react';
import { ScheduleItem, UserRole, PermissionAction } from '../types';

interface ScheduleTableProps {
  items: ScheduleItem[];
  currentUserRole: UserRole;
  onToggleSubtask: (itemId: string, subtaskId: string) => void;
  onUpdateEvaluation: (itemId: string, evaluation: number) => void;
  onEditItem: (item: ScheduleItem) => void;
  onDeleteItem: (item: ScheduleItem) => void;
  onAddSubtask: (itemId: string, text: string) => void;
  onRestrictedAction: (action: PermissionAction) => void;
  onSetReminder?: (item: ScheduleItem) => void;
  onViewLocation?: (item: ScheduleItem) => void;
  onChatTask?: (item: ScheduleItem) => void;
  onSendTelegram?: (item: ScheduleItem) => void;
  onExportCalendar?: (item: ScheduleItem) => void;
}

export const ScheduleTable: React.FC<ScheduleTableProps> = ({
  items,
  currentUserRole,
  onToggleSubtask,
  onUpdateEvaluation,
  onEditItem,
  onDeleteItem,
  onAddSubtask,
  onRestrictedAction,
  onSetReminder,
  onViewLocation,
  onChatTask,
  onSendTelegram,
  onExportCalendar,
}) => {
  const [newSubtaskInputs, setNewSubtaskInputs] = useState<{ [key: string]: string }>({});
  const [activeInputRow, setActiveInputRow] = useState<string | null>(null);

  const isViewer = currentUserRole === 'Viewer';
  const isAdmin = currentUserRole === 'Admin';

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'Cleaning':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Maintenance':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Plumbing':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Family':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const handleSubtaskKeyDown = (itemId: string, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const text = newSubtaskInputs[itemId]?.trim();
      if (text) {
        onAddSubtask(itemId, text);
        setNewSubtaskInputs((prev) => ({ ...prev, [itemId]: '' }));
        setActiveInputRow(null);
      }
    }
  };

  const handleAddSubtaskClick = (itemId: string) => {
    const text = newSubtaskInputs[itemId]?.trim();
    if (text) {
      onAddSubtask(itemId, text);
      setNewSubtaskInputs((prev) => ({ ...prev, [itemId]: '' }));
      setActiveInputRow(null);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/90 text-slate-600 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
              <th className="py-3.5 px-4 w-[160px]">Day & Category</th>
              <th className="py-3.5 px-4 w-[180px]">Responsible</th>
              <th className="py-3.5 px-6">Key Activities & Action Checklist</th>
              <th className="py-3.5 px-5 w-[220px]">Evaluation / Progress</th>
              <th className="py-3.5 px-4 w-[120px] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="w-8 h-8 text-slate-300" />
                    <p className="text-base font-medium text-slate-600">No activities match the filter</p>
                    <p className="text-xs text-slate-400">Try changing your search term or filter selection</p>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item, idx) => {
                const totalSub = item.subtasks.length;
                const doneSub = item.subtasks.filter((s) => s.completed).length;

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      idx % 2 === 1 ? 'bg-slate-50/20' : 'bg-white'
                    }`}
                  >
                    {/* Day & Category */}
                    <td className="py-4 px-4 align-top">
                      <div className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.day}</span>
                      </div>
                      <div className="mt-1.5">
                        <span
                          className={`inline-block px-2 py-0.5 text-[11px] font-medium border rounded-md ${getCategoryBadge(
                            item.category
                          )}`}
                        >
                          {item.category}
                        </span>
                      </div>
                    </td>

                    {/* Responsible */}
                    <td className="py-4 px-4 align-top">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-2xs ${
                            item.responsible.includes('Assaye')
                              ? 'bg-sky-600'
                              : 'bg-indigo-600'
                          }`}
                        >
                          {item.responsible.includes('&') ? 'A&K' : item.responsible.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 leading-tight">
                            {item.responsible}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {item.responsible.includes('&') ? 'Joint Collaboration' : 'Primary Lead'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Key Activities & Interactive Subtasks */}
                    <td className="py-4 px-6 align-top">
                      {/* Subtasks checklist */}
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
                            className={`flex items-start gap-2.5 p-1.5 rounded-md transition-colors group ${
                              isViewer ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
                            } ${
                              sub.completed
                                ? 'bg-emerald-50/50 text-slate-400 line-through'
                                : 'hover:bg-slate-100/80 text-slate-800'
                            }`}
                            title={isViewer ? 'Read-only: Checking off items requires Editor or Admin role' : undefined}
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
                              className={`mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 ${
                                isViewer ? 'cursor-not-allowed' : 'cursor-pointer'
                              }`}
                            />
                            <span className="text-xs font-medium leading-relaxed select-none">
                              {sub.text}
                            </span>
                          </label>
                        ))}
                      </div>

                      {/* Safety & Protocol note if present */}
                      {item.safetyNotes && (
                        <div className="mt-2.5 flex items-start gap-1.5 px-2.5 py-1.5 rounded-md bg-amber-50 border border-amber-200/70 text-amber-900 text-xs">
                          <Shield className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span className="font-medium">{item.safetyNotes}</span>
                        </div>
                      )}

                      {/* Inline Add Subtask */}
                      {isViewer ? (
                        <button
                          type="button"
                          onClick={() => onRestrictedAction('add_subtask')}
                          className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-600 cursor-not-allowed transition-colors"
                          title="Adding action items requires Editor or Admin role"
                        >
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span>Add action checklist item</span>
                        </button>
                      ) : activeInputRow === item.id ? (
                        <div className="mt-2.5 flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Type new action item & press Enter..."
                            value={newSubtaskInputs[item.id] || ''}
                            onChange={(e) =>
                              setNewSubtaskInputs((prev) => ({
                                ...prev,
                                [item.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => handleSubtaskKeyDown(item.id, e)}
                            autoFocus
                            className="flex-1 px-2.5 py-1 text-xs bg-white border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddSubtaskClick(item.id)}
                            className="px-2.5 py-1 text-xs font-semibold bg-indigo-600 text-white rounded hover:bg-indigo-700"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveInputRow(null)}
                            className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveInputRow(item.id)}
                          className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add action checklist item</span>
                        </button>
                      )}
                    </td>

                    {/* Evaluation / Progress */}
                    <td className="py-4 px-5 align-top">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-800">
                          {item.evaluation}%
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {doneSub}/{totalSub} checked
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-2.5">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            item.evaluation === 100
                              ? 'bg-emerald-500'
                              : item.evaluation > 0
                              ? 'bg-indigo-600'
                              : 'bg-slate-300'
                          }`}
                          style={{ width: `${item.evaluation}%` }}
                        ></div>
                      </div>

                      {/* Quick Percentage Presets */}
                      <div className="flex items-center gap-1">
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
                            className={`px-1.5 py-0.5 text-[10px] rounded font-semibold transition-all ${
                              isViewer
                                ? 'cursor-not-allowed opacity-60 bg-slate-100 text-slate-400'
                                : item.evaluation === preset
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            title={isViewer ? 'Read-only: Updating evaluation requires Editor or Admin' : undefined}
                          >
                            {preset}%
                          </button>
                        ))}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 align-top text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Send message by Telegram */}
                        <button
                          type="button"
                          onClick={() => onSendTelegram?.(item)}
                          title="Send milestone details by Telegram"
                          className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-md transition-colors"
                        >
                          <Send className="w-4 h-4" />
                        </button>

                        {/* Chat about task with friends / team */}
                        <button
                          type="button"
                          onClick={() => onChatTask?.(item)}
                          title="Chat about this task with friends & team"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>

                        {/* Reminder button */}
                        <button
                          type="button"
                          onClick={() => onSetReminder?.(item)}
                          title="Set Email / SMS Notification Reminder for this Task"
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                        >
                          <Bell className="w-4 h-4" />
                        </button>

                        {/* Location button */}
                        <button
                          type="button"
                          onClick={() => onViewLocation?.(item)}
                          title={
                            item.location
                              ? `View pinned GPS location (${item.location.address || 'GPS Coordinates'})`
                              : 'Pin live GPS location to this task'
                          }
                          className={`p-1.5 rounded-md transition-colors ${
                            item.location
                              ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-100'
                          }`}
                        >
                          <MapPin className="w-4 h-4" />
                        </button>

                        {/* Calendar export button */}
                        <button
                          type="button"
                          onClick={() => onExportCalendar?.(item)}
                          title="Push this milestone directly to Google Calendar"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                        >
                          <Calendar className="w-4 h-4" />
                        </button>

                        {isViewer ? (
                          <button
                            type="button"
                            onClick={() => onRestrictedAction('edit_task')}
                            title="Editing is restricted to Editor and Admin roles"
                            className="p-1.5 text-slate-300 hover:text-slate-500 rounded-md transition-colors"
                          >
                            <Lock className="w-4 h-4 text-slate-400" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onEditItem(item)}
                            title="Edit Task"
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}

                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() => onDeleteItem(item)}
                            title="Delete Task (Admin)"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onRestrictedAction('delete_task')}
                            title="Deleting milestones is restricted to Admin role"
                            className="p-1.5 text-slate-300 hover:text-slate-400 rounded-md transition-colors cursor-not-allowed"
                          >
                            <Trash2 className="w-4 h-4 text-slate-300" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
