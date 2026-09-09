import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Shield, Calendar, User, Lock, Sparkles, RefreshCw, CalendarDays } from 'lucide-react';
import { ScheduleItem, Subtask, UserRole } from '../types';
import { optimizeTaskWithGemini } from '../services/gemini';

interface TaskModalProps {
  isOpen: boolean;
  item: ScheduleItem | null;
  onSave: (item: Partial<ScheduleItem>) => void;
  onClose: () => void;
  currentUserRole?: UserRole;
  onExportToCalendar?: (item: ScheduleItem) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  item,
  onSave,
  onClose,
  currentUserRole = 'Editor',
  onExportToCalendar,
}) => {
  const isViewer = currentUserRole === 'Viewer';
  const [day, setDay] = useState('');
  const [responsible, setResponsible] = useState('Kibrom');
  const [category, setCategory] = useState<'Maintenance' | 'Cleaning' | 'Plumbing' | 'Family' | 'General'>('Cleaning');
  const [keyActivities, setKeyActivities] = useState('');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [evaluation, setEvaluation] = useState(0);
  const [safetyNotes, setSafetyNotes] = useState('');
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);
  const [geminiAdvice, setGeminiAdvice] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setDay(item.day);
      setResponsible(item.responsible);
      setCategory(item.category);
      setKeyActivities(item.keyActivities);
      setSubtasks(item.subtasks);
      setEvaluation(item.evaluation);
      setSafetyNotes(item.safetyNotes || '');
    } else {
      setDay('');
      setResponsible('Kibrom');
      setCategory('Maintenance');
      setKeyActivities('');
      setSubtasks([]);
      setEvaluation(0);
      setSafetyNotes('');
    }
  }, [item, isOpen]);

  if (!isOpen) return null;

  const handleAddSubtask = () => {
    if (!newSubtaskText.trim()) return;
    setSubtasks((prev) => [
      ...prev,
      {
        id: `sub-${Date.now()}`,
        text: newSubtaskText.trim(),
        completed: false,
      },
    ]);
    setNewSubtaskText('');
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!day.trim()) return;

    // If key activities is empty but subtasks exist, join them
    const effectiveActivities =
      keyActivities.trim() || subtasks.map((s) => s.text).join('\n');

    onSave({
      day: day.trim(),
      responsible: responsible.trim(),
      category,
      keyActivities: effectiveActivities,
      subtasks:
        subtasks.length > 0
          ? subtasks
          : effectiveActivities
              .split('\n')
              .filter(Boolean)
              .map((t, idx) => ({ id: `sub-${Date.now()}-${idx}`, text: t.trim(), completed: false })),
      evaluation: Number(evaluation),
      safetyNotes: safetyNotes.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <h2 className="text-base font-bold">
            {item ? `Edit Schedule Item: ${item.day}` : 'Add New Schedule Item'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Day & Assignee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Day / Date Range <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Monday, Fri-Sun, Next Mon-Wed"
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Responsible Person <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Kibrom, Assaye & Kibrom"
                  value={responsible}
                  onChange={(e) => setResponsible(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Category & Evaluation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="Cleaning">Cleaning</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Plumbing">Plumbing</option>
                <option value="Family">Family</option>
                <option value="General">General</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Evaluation Progress
                </label>
                <span className="text-xs font-bold text-indigo-700">{evaluation}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={evaluation}
                onChange={(e) => setEvaluation(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-2"
              />
            </div>
          </div>

          {/* Key Activities Overview */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Key Activities Overview
            </label>
            <textarea
              rows={3}
              placeholder="Summary of day's work and objectives..."
              value={keyActivities}
              onChange={(e) => setKeyActivities(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Interactive Subtasks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Action Items / Subtasks
            </label>
            <div className="space-y-2 mb-2">
              {subtasks.map((sub, idx) => (
                <div key={sub.id} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs">
                  <span className="text-slate-400 font-mono w-4">{idx + 1}.</span>
                  <input
                    type="text"
                    value={sub.text}
                    onChange={(e) => {
                      const newText = e.target.value;
                      setSubtasks((prev) =>
                        prev.map((s) => (s.id === sub.id ? { ...s, text: newText } : s))
                      );
                    }}
                    className="flex-1 bg-transparent border-none focus:outline-none text-slate-800 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(sub.id)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add another subtask action..."
                value={newSubtaskText}
                onChange={(e) => setNewSubtaskText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Gemini AI Task Optimization Helper */}
          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-xs font-bold text-indigo-900">Gemini Task Advisor</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={isGeminiLoading}
                  onClick={async () => {
                    setIsGeminiLoading(true);
                    try {
                      const advice = await optimizeTaskWithGemini({
                        id: item?.id || 'temp',
                        day: day || 'General',
                        category,
                        responsible,
                        keyActivities,
                        subtasks,
                        evaluation,
                        safetyNotes,
                      }, 'breakdown');
                      setGeminiAdvice(advice);
                    } catch (e: any) {
                      setGeminiAdvice(e.message || 'Could not reach Gemini');
                    } finally {
                      setIsGeminiLoading(false);
                    }
                  }}
                  className="px-2 py-1 text-[11px] font-semibold bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isGeminiLoading ? 'animate-spin' : ''}`} />
                  <span>Break Down Steps</span>
                </button>

                <button
                  type="button"
                  disabled={isGeminiLoading}
                  onClick={async () => {
                    setIsGeminiLoading(true);
                    try {
                      const advice = await optimizeTaskWithGemini({
                        id: item?.id || 'temp',
                        day: day || 'General',
                        category,
                        responsible,
                        keyActivities,
                        subtasks,
                        evaluation,
                        safetyNotes,
                      }, 'reschedule');
                      setGeminiAdvice(advice);
                    } catch (e: any) {
                      setGeminiAdvice(e.message || 'Could not reach Gemini');
                    } finally {
                      setIsGeminiLoading(false);
                    }
                  }}
                  className="px-2 py-1 text-[11px] font-semibold bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>Postpone Advice</span>
                </button>
              </div>
            </div>

            {geminiAdvice && (
              <div className="p-2.5 bg-white border border-indigo-100 rounded-lg text-xs text-slate-700 whitespace-pre-wrap max-h-36 overflow-y-auto">
                {geminiAdvice}
              </div>
            )}
          </div>

          {/* Safety Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-600" />
              <span>Safety Precautions & Notes</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Wear mask & gloves, seal area for 48h..."
              value={safetyNotes}
              onChange={(e) => setSafetyNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            {isViewer ? (
              <span className="text-xs text-amber-800 font-medium flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                Read-only inspection (Viewer role cannot save changes)
              </span>
            ) : <span />}
            <div className="flex items-center gap-2">
              {item && onExportToCalendar && (
                <button
                  type="button"
                  id="task-modal-push-calendar-btn"
                  onClick={() => onExportToCalendar(item)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                  title="Push this milestone directly to your personal Google Calendar"
                >
                  <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                  <span>Push to Calendar</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                {isViewer ? 'Close' : 'Cancel'}
              </button>
              {!isViewer && (
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm"
                >
                  {item ? 'Save Changes' : 'Create Item'}
                </button>
              )}
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
