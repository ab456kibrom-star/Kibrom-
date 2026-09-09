import React, { useState } from 'react';
import {
  FileSpreadsheet,
  X,
  ExternalLink,
  Upload,
  Download,
  PlusCircle,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { GoogleSheetsSyncState, ScheduleItem, UserRole, PermissionAction } from '../types';
import { ROLE_DEFINITIONS } from '../services/rbac';

interface SheetsSyncModalProps {
  isOpen: boolean;
  user: User | null;
  syncState: GoogleSheetsSyncState;
  items: ScheduleItem[];
  currentUserRole: UserRole;
  onClose: () => void;
  onLogin: () => void;
  onCreateNewSheet: (title: string) => Promise<void>;
  onUpdateExistingSheet: () => Promise<void>;
  onImportFromSheet: (sheetId: string) => Promise<void>;
  onRestrictedAction: (action: PermissionAction) => void;
}

export const SheetsSyncModal: React.FC<SheetsSyncModalProps> = ({
  isOpen,
  user,
  syncState,
  items,
  currentUserRole,
  onClose,
  onLogin,
  onCreateNewSheet,
  onUpdateExistingSheet,
  onImportFromSheet,
  onRestrictedAction,
}) => {
  const [sheetTitle, setSheetTitle] = useState('Weekly Activity & Maintenance Schedule');
  const [existingIdInput, setExistingIdInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isViewer = currentUserRole === 'Viewer';
  const isAdmin = currentUserRole === 'Admin';
  const roleMeta = ROLE_DEFINITIONS[currentUserRole];

  const handleCreateNew = async () => {
    if (isViewer) {
      onRestrictedAction('sync_sheets');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await onCreateNewSheet(sheetTitle);
      setSuccessMessage('Spreadsheet created and formatted successfully!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create spreadsheet.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (isViewer) {
      onRestrictedAction('sync_sheets');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await onUpdateExistingSheet();
      setSuccessMessage('Google Sheet updated with current schedule data!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update spreadsheet.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!isAdmin) {
      onRestrictedAction('import_sheets');
      return;
    }
    const raw = existingIdInput.trim();
    if (!raw) return;

    // Extract ID if full URL pasted
    let id = raw;
    const match = raw.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      id = match[1];
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await onImportFromSheet(id);
      setSuccessMessage('Schedule imported successfully from Google Sheet!');
      setExistingIdInput('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to import spreadsheet.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-800 text-white">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Google Sheets Integration</h2>
              <p className="text-xs text-emerald-200">Two-way sync & live spreadsheet export</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-emerald-300 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Feedback messages */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Auth Check */}
          {!user ? (
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Google Account Required</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Sign in with your Google account to grant permission to create and sync your schedule in Google Sheets.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onLogin}
                  className="gsi-material-button mx-auto"
                >
                  <div className="gsi-material-button-content-wrapper">
                    <div className="gsi-material-button-icon">
                      <svg
                        version="1.1"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 48 48"
                        style={{ display: 'block' }}
                      >
                        <path
                          fill="#EA4335"
                          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                        ></path>
                        <path
                          fill="#4285F4"
                          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                        ></path>
                        <path
                          fill="#FBBC05"
                          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                        ></path>
                        <path
                          fill="#34A853"
                          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                        ></path>
                        <path fill="none" d="M0 0h48v48H0z"></path>
                      </svg>
                    </div>
                    <span className="gsi-material-button-contents">Sign in with Google</span>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* RBAC Role Status Banner inside Modal */}
              <div className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                isViewer
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : isAdmin
                  ? 'bg-purple-50 border-purple-200 text-purple-900'
                  : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] border ${roleMeta.badgeBg} ${roleMeta.badgeText} ${roleMeta.badgeBorder}`}>
                    {currentUserRole}
                  </span>
                  <span>
                    {isViewer && 'Read-only mode. Pushing syncs or importing requires Editor or Admin role.'}
                    {currentUserRole === 'Editor' && 'Create & Sync enabled. Workspace import restricted to Admin.'}
                    {isAdmin && 'Full administrative access for Google Sheets operations.'}
                  </span>
                </div>
              </div>

              {/* Connected Sheet Status */}
              {syncState.spreadsheetUrl && (
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                      Connected Spreadsheet
                    </span>
                    <a
                      href={syncState.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1"
                    >
                      <span>Open in Sheets</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <p className="text-sm font-bold text-slate-900 mt-1 truncate">
                    {syncState.spreadsheetTitle || 'Schedule Matrix'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Last Synced: {syncState.lastSyncedAt ? new Date(syncState.lastSyncedAt).toLocaleTimeString() : 'Just now'}
                  </p>
                  <button
                    type="button"
                    onClick={handleUpdate}
                    disabled={isLoading}
                    className={`mt-3 w-full py-2 px-3 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                      isViewer
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {isViewer ? <Lock className="w-3.5 h-3.5 text-slate-400" /> : <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
                    <span>{isViewer ? 'Sync Updates (Requires Editor or Admin)' : 'Sync Updates to Connected Sheet'}</span>
                  </button>
                </div>
              )}

              {/* Option 1: Create New Sheet */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Create New Google Sheet
                  </h4>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    Spreadsheet Title
                  </label>
                  <input
                    type="text"
                    value={sheetTitle}
                    disabled={isViewer}
                    onChange={(e) => setSheetTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCreateNew}
                  disabled={isLoading}
                  className={`w-full py-2 px-3 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                    isViewer
                      ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {isViewer ? <Lock className="w-3.5 h-3.5 text-slate-400" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>{isViewer ? 'Export (Requires Editor or Admin)' : isLoading ? 'Creating...' : 'Export Current Schedule as New Sheet'}</span>
                </button>
              </div>

              {/* Option 2: Link / Import Existing Sheet */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Import from Existing Sheet
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200">
                    Admin Only
                  </span>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    Paste Google Sheet URL or ID
                  </label>
                  <input
                    type="text"
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                    value={existingIdInput}
                    disabled={!isAdmin}
                    onChange={(e) => setExistingIdInput(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={isLoading || (!isAdmin ? false : !existingIdInput.trim())}
                  className={`w-full py-2 px-3 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                    !isAdmin
                      ? 'bg-slate-100 border border-slate-200 text-slate-500 hover:bg-slate-200 cursor-not-allowed'
                      : 'bg-white border border-slate-300 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {!isAdmin ? <Lock className="w-3.5 h-3.5 text-slate-400" /> : <Download className="w-3.5 h-3.5" />}
                  <span>{!isAdmin ? 'Import Schedule (Admin Only)' : 'Load Data from Existing Sheet'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>{items.length} schedule milestones ready to sync</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
