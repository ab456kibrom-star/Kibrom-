import React, { useState, useEffect } from 'react';
import {
  Calendar,
  X,
  Check,
  CalendarCheck,
  ExternalLink,
  AlertCircle,
  Loader2,
  Bell,
  Clock,
  User,
  ShieldCheck,
  ChevronRight,
  CheckCircle2,
  CalendarDays,
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { ScheduleItem } from '../types';
import {
  calculateMilestoneDates,
  exportMilestonesToGoogleCalendar,
  formatDateYMD,
  getMondayOfWeek,
  getUserCalendars,
  GoogleCalendarItem,
  CalendarExportResult,
} from '../services/calendar';
import { ConfirmModal } from './ConfirmModal';

interface CalendarExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ScheduleItem[];
  user: FirebaseUser | null;
  onLogin: () => void;
  singleItemToExport?: ScheduleItem | null;
}

export const CalendarExportModal: React.FC<CalendarExportModalProps> = ({
  isOpen,
  onClose,
  items,
  user,
  onLogin,
  singleItemToExport,
}) => {
  const initialMonday = formatDateYMD(getMondayOfWeek(new Date()));
  const [targetMonday, setTargetMonday] = useState<string>(initialMonday);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('primary');
  const [calendars, setCalendars] = useState<GoogleCalendarItem[]>([
    { id: 'primary', summary: 'Primary Calendar', primary: true },
  ]);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);

  // Selected item IDs to push
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [enableReminders, setEnableReminders] = useState<boolean>(true);

  // Export progress and state
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  const [exportResult, setExportResult] = useState<CalendarExportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // User confirmation dialog state
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  // Initialize selected items when modal opens or singleItem changes
  useEffect(() => {
    if (isOpen) {
      if (singleItemToExport) {
        setSelectedItemIds([singleItemToExport.id]);
      } else {
        setSelectedItemIds(items.map((i) => i.id));
      }
      setExportResult(null);
      setErrorMessage(null);
      setIsExporting(false);
    }
  }, [isOpen, singleItemToExport, items]);

  // Load calendars when user is signed in and modal opens
  useEffect(() => {
    if (isOpen && user) {
      setIsLoadingCalendars(true);
      getUserCalendars()
        .then((calList) => {
          if (calList && calList.length > 0) {
            setCalendars(calList);
            const primaryCal = calList.find((c) => c.primary);
            setSelectedCalendarId(primaryCal ? primaryCal.id : calList[0].id);
          }
        })
        .catch((err) => {
          console.warn('Could not list calendars:', err);
        })
        .finally(() => {
          setIsLoadingCalendars(false);
        });
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const itemsToDisplay = singleItemToExport ? [singleItemToExport] : items;
  const selectedCount = selectedItemIds.length;

  const handleToggleItem = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedItemIds.length === itemsToDisplay.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(itemsToDisplay.map((i) => i.id));
    }
  };

  // Called when user clicks "Push to Google Calendar" button: Triggers mandatory confirmation dialog
  const handleInitiateExport = () => {
    if (selectedCount === 0) return;
    setErrorMessage(null);
    setShowConfirmModal(true);
  };

  // Called when user confirms in ConfirmModal
  const handleConfirmAndExecuteExport = async () => {
    setShowConfirmModal(false);
    setIsExporting(true);
    setErrorMessage(null);
    setExportResult(null);
    setExportProgress({ current: 0, total: selectedCount });

    const targetItems = itemsToDisplay.filter((i) => selectedItemIds.includes(i.id));

    try {
      const result = await exportMilestonesToGoogleCalendar(
        targetItems,
        targetMonday,
        selectedCalendarId,
        enableReminders,
        (current, total) => {
          setExportProgress({ current, total });
        }
      );

      setExportResult(result);
    } catch (err: any) {
      console.error('Calendar export error:', err);
      setErrorMessage(err.message || 'Failed to export milestones to Google Calendar.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      id="calendar-export-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div
        id="calendar-export-modal-container"
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center border border-blue-200/50">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                Export to Google Calendar
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Push scheduled weekly milestones directly to your personal Google Calendar
              </p>
            </div>
          </div>
          <button
            type="button"
            id="calendar-export-modal-close-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Auth Check Banner */}
          {!user ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-amber-900">
                    Sign in with Google required
                  </h4>
                  <p className="text-xs text-amber-700 mt-0.5">
                    To push milestones to Google Calendar, sign in with your Google Account and authorize calendar access.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onLogin}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer"
              >
                Sign in with Google
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <User className="w-4 h-4 text-slate-400" />
                <span>Connected as:</span>
                <span className="font-semibold text-slate-900">{user.email}</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <Check className="w-3 h-3" /> Ready to Sync
              </span>
            </div>
          )}

          {/* Configuration Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Week Starting Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Week Starting Date (Monday)
              </label>
              <div className="relative">
                <input
                  type="date"
                  id="calendar-target-date-input"
                  value={targetMonday}
                  onChange={(e) => setTargetMonday(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs text-slate-800 bg-white border border-slate-200 rounded-lg shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Milestones will be placed on the corresponding days of this week.
              </p>
            </div>

            {/* Target Calendar */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Target Google Calendar
              </label>
              <div className="relative">
                <select
                  id="calendar-select-target"
                  value={selectedCalendarId}
                  onChange={(e) => setSelectedCalendarId(e.target.value)}
                  disabled={!user || isLoadingCalendars}
                  className="w-full px-3.5 py-2 text-xs text-slate-800 bg-white border border-slate-200 rounded-lg shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {calendars.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.summary} {c.primary ? '(Primary)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Events will be created in this calendar.
              </p>
            </div>
          </div>

          {/* Event Preferences */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                id="calendar-reminders-checkbox"
                checked={enableReminders}
                onChange={(e) => setEnableReminders(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800">
                <Bell className="w-3.5 h-3.5 text-blue-600" />
                <span>Add calendar notifications (24 hours & 1 hour prior)</span>
              </div>
            </label>
            <p className="text-[11px] text-slate-500 pl-6">
              Includes full task checklist, safety notes, location info, and responsible team member in the event description.
            </p>
          </div>

          {/* Milestones Preview List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  Milestones to Export
                </h4>
                <span className="text-xs text-slate-500">
                  ({selectedCount} of {itemsToDisplay.length} selected)
                </span>
              </div>
              {!singleItemToExport && itemsToDisplay.length > 1 && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  {selectedCount === itemsToDisplay.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-56 overflow-y-auto bg-white">
              {itemsToDisplay.map((item) => {
                const isSelected = selectedItemIds.includes(item.id);
                const { startDate, label } = calculateMilestoneDates(item.day, targetMonday);
                const firstLine = item.keyActivities.split('\n')[0];

                return (
                  <label
                    key={item.id}
                    className={`flex items-start gap-3 p-3 transition-colors cursor-pointer select-none ${
                      isSelected ? 'bg-blue-50/40 hover:bg-blue-50/70' : 'hover:bg-slate-50/60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleItem(item.id)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-xs font-semibold text-slate-900 font-mono">
                          {startDate}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500">
                          ({label})
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.2 text-[10px] font-semibold text-slate-700 bg-slate-100 rounded border border-slate-200">
                          {item.category}
                        </span>
                        <span className="text-[11px] text-slate-500 ml-auto">
                          {item.responsible}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-1">
                        {firstLine}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Progress / Success State */}
          {isExporting && (
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-blue-900">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  Exporting to Google Calendar...
                </span>
                <span>
                  {exportProgress.current} / {exportProgress.total}
                </span>
              </div>
              <div className="w-full bg-blue-200/60 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 transition-all duration-300 rounded-full"
                  style={{
                    width: `${
                      exportProgress.total > 0
                        ? (exportProgress.current / exportProgress.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Export Failed</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Export Success Result */}
          {exportResult && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-900 font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>
                    Successfully pushed {exportResult.createdEventsCount} event(s) to Google Calendar!
                  </span>
                </div>
                <a
                  href={exportResult.calendarHtmlLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors"
                >
                  <span>Open Calendar</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {exportResult.eventLinks.length > 0 && (
                <div className="mt-2 space-y-1 max-h-36 overflow-y-auto divide-y divide-emerald-100 text-xs text-emerald-900 bg-white/70 rounded-lg p-2 border border-emerald-200/60">
                  {exportResult.eventLinks.map((evt, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1 px-1">
                      <span className="font-medium truncate max-w-[320px]">{evt.summary}</span>
                      <a
                        href={evt.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium ml-2 shrink-0"
                      >
                        View Event <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <p className="text-xs text-slate-500">
            Events are synced with your Google account via secure Google Calendar API.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
            >
              {exportResult ? 'Close' : 'Cancel'}
            </button>
            <button
              type="button"
              id="calendar-export-submit-btn"
              onClick={handleInitiateExport}
              disabled={!user || selectedCount === 0 || isExporting}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg shadow-2xs transition-all cursor-pointer"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Pushing Events...</span>
                </>
              ) : (
                <>
                  <CalendarCheck className="w-3.5 h-3.5" />
                  <span>Push {selectedCount} Event(s) to Calendar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mandatory User Confirmation Dialog for Mutating Google Calendar Data */}
      <ConfirmModal
        isOpen={showConfirmModal}
        title="Confirm Google Calendar Export"
        message={`Are you sure you want to push ${selectedCount} scheduled milestone event(s) to your Google Calendar (${
          calendars.find((c) => c.id === selectedCalendarId)?.summary || 'Primary'
        }) starting the week of ${targetMonday}?\n\nThis will create new calendar entries with descriptions, subtasks, and reminders on your personal schedule.`}
        confirmLabel={`Export ${selectedCount} Event(s)`}
        cancelLabel="Cancel"
        isDestructive={false}
        onConfirm={handleConfirmAndExecuteExport}
        onCancel={() => setShowConfirmModal(false)}
      />
    </div>
  );
};
