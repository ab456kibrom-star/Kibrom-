import React from 'react';
import {
  CalendarDays,
  FileSpreadsheet,
  Download,
  Plus,
  ExternalLink,
  LogOut,
  Sparkles,
  LayoutGrid,
  Columns,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { ViewMode, GoogleSheetsSyncState, UserRole } from '../types';
import { Shield, ShieldAlert, Crown, Edit3, Eye, Lock, Bell, Crosshair, Navigation, MessageSquare } from 'lucide-react';
import { ROLE_DEFINITIONS } from '../services/rbac';

interface HeaderProps {
  user: User | null;
  isLoggingIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
  syncState: GoogleSheetsSyncState;
  onOpenSyncModal: () => void;
  onExportCsv: () => void;
  onOpenAddModal: () => void;
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  currentUserRole: UserRole;
  onOpenRbacModal: () => void;
  onSwitchRole: (role: UserRole) => void;
  dueTodayCount: number;
  onOpenNotifications: () => void;
  onOpenLiveLocation: () => void;
  unreadChatCount?: number;
  onOpenChat?: () => void;
  onOpenGemini?: () => void;
  onOpenCalendarExport?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  isLoggingIn,
  onLogin,
  onLogout,
  syncState,
  onOpenSyncModal,
  onExportCsv,
  onOpenAddModal,
  viewMode,
  onChangeViewMode,
  currentUserRole,
  onOpenRbacModal,
  onSwitchRole,
  dueTodayCount,
  onOpenNotifications,
  onOpenLiveLocation,
  unreadChatCount = 0,
  onOpenChat,
  onOpenGemini,
  onOpenCalendarExport,
}) => {
  const roleMeta = ROLE_DEFINITIONS[currentUserRole];
  const isViewer = currentUserRole === 'Viewer';
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-3.5 gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm shrink-0">
              <CalendarDays className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  Weekly Activity Schedule
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-500 font-normal">
                Field maintenance, plumbing, deep cleaning & team coordination
              </p>
            </div>
          </div>

          {/* User Auth & Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Group 1: Team & Collaboration Tools */}
            <div className="inline-flex items-center gap-1.5">
              {/* Gemini AI Copilot Button */}
              <button
                id="header-gemini-copilot-btn"
                type="button"
                onClick={onOpenGemini}
                title="Gemini AI Schedule Copilot & Feasibility Advisor"
                className="relative inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-700 hover:to-violet-800 rounded-lg transition-all shadow-xs group cursor-pointer border border-indigo-400/30"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-200 group-hover:rotate-12 transition-transform" />
                <span>Gemini</span>
                <span className="hidden sm:inline text-[10px] font-semibold px-1.5 py-0.2 bg-white/20 rounded-full text-indigo-100">
                  AI
                </span>
              </button>

              {/* Chat with Friends Button */}
              <button
                id="header-chat-btn"
                type="button"
                onClick={onOpenChat}
                title="Chat with friends & teammates in real-time"
                className="relative inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-950 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 rounded-lg transition-all shadow-2xs group cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-indigo-600 group-hover:scale-105 transition-transform" />
                <span>Chat</span>
                {unreadChatCount > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 bg-indigo-600 text-white font-bold text-[10px] rounded-full flex items-center justify-center shadow-xs border border-white">
                    {unreadChatCount}
                  </span>
                )}
              </button>

              {/* Show Live Location Button */}
              <button
                id="header-live-location-btn"
                type="button"
                onClick={onOpenLiveLocation}
                title="Show Real-time GPS Location & Interactive Map"
                className="relative inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all shadow-2xs group cursor-pointer"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <Navigation className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-105 transition-transform" />
                <span>Live GPS</span>
              </button>

              {/* Notification Bell Icon */}
              <button
                id="header-notifications-btn"
                type="button"
                onClick={onOpenNotifications}
                title={
                  dueTodayCount > 0
                    ? `${dueTodayCount} task(s) due today! Click to view and send email/SMS reminders`
                    : 'Task Reminders & Notifications'
                }
                className={`relative inline-flex items-center justify-center p-2 rounded-lg border transition-all cursor-pointer ${
                  dueTodayCount > 0
                    ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-2xs'
                }`}
              >
                <Bell className={`w-4 h-4 ${dueTodayCount > 0 ? 'text-amber-700 animate-wiggle' : 'text-slate-500'}`} />
                {dueTodayCount > 0 ? (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center shadow-xs border border-white">
                    {dueTodayCount}
                  </span>
                ) : (
                  <span className="sr-only">Notifications</span>
                )}
              </button>
            </div>

            <div className="hidden sm:block w-[1px] h-6 bg-slate-200 mx-0.5"></div>

            {/* Group 2: Data & Sync */}
            <div className="inline-flex items-center gap-1.5">
              {/* Sheets Sync Action */}
              <button
                id="header-sync-sheets-btn"
                type="button"
                onClick={onOpenSyncModal}
                className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all shadow-2xs cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Sheets</span>
              </button>

              {/* Google Calendar export */}
              {onOpenCalendarExport && (
                <button
                  id="header-export-calendar-btn"
                  type="button"
                  onClick={onOpenCalendarExport}
                  title="Export scheduled milestones to Google Calendar"
                  className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all shadow-2xs cursor-pointer"
                >
                  <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                  <span className="hidden sm:inline">Calendar</span>
                </button>
              )}

              {/* CSV export */}
              <button
                id="header-export-csv-btn"
                type="button"
                onClick={onExportCsv}
                title="Download CSV file"
                className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">CSV</span>
              </button>
            </div>

            <div className="hidden sm:block w-[1px] h-6 bg-slate-200 mx-0.5"></div>

            {/* Group 3: Identity & Roles */}
            <div className="inline-flex items-center gap-1.5">
              {/* RBAC Role Indicator & Quick Switcher */}
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-2xs">
                <button
                  id="header-rbac-btn"
                  type="button"
                  onClick={onOpenRbacModal}
                  title="Open Role-Based Access Control settings & permissions matrix"
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all border ${roleMeta.badgeBg} ${roleMeta.badgeText} ${roleMeta.badgeBorder} hover:brightness-95 cursor-pointer`}
                >
                  {currentUserRole === 'Admin' && <Crown className="w-3.5 h-3.5 text-purple-600" />}
                  {currentUserRole === 'Editor' && <Edit3 className="w-3.5 h-3.5 text-blue-600" />}
                  {currentUserRole === 'Viewer' && <Eye className="w-3.5 h-3.5 text-slate-600" />}
                  <span>{currentUserRole}</span>
                  <span className="text-[10px] opacity-70">▾</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenRbacModal}
                  title="View Permissions Matrix & Manage Team Roles"
                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Google Sign-in / Profile */}
              {user ? (
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1 pr-2 shadow-2xs">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-6 h-6 rounded-full object-cover border border-slate-200"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold">
                      {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </div>
                  )}
                  <button
                    id="header-logout-btn"
                    onClick={onLogout}
                    title={`Signed in as ${user.email}. Click to sign out`}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  id="header-google-signin-btn"
                  type="button"
                  className="gsi-material-button"
                  onClick={onLogin}
                  disabled={isLoggingIn}
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
                    <span className="gsi-material-button-contents">
                      {isLoggingIn ? 'Connecting...' : 'Sign in'}
                    </span>
                  </div>
                </button>
              )}

              {/* Primary Action Button: Add Task with RBAC awareness */}
              <button
                id="header-add-task-btn"
                type="button"
                onClick={onOpenAddModal}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer ${
                  isViewer
                    ? 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                    : 'text-white bg-slate-900 hover:bg-slate-800'
                }`}
                title={isViewer ? 'Restricted: Viewer has read-only access (Click to view policy)' : 'Add Milestone / Day'}
              >
                {isViewer ? <Lock className="w-3.5 h-3.5 text-slate-400" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Add Day</span>
              </button>
            </div>
          </div>
        </div>

        {/* Read-Only Notice Bar if Viewer */}
        {isViewer && (
          <div className="bg-amber-50/90 border-t border-amber-200 py-1.5 px-4 text-center text-xs text-amber-900 flex items-center justify-center gap-2">
            <Eye className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>
              <strong>Viewer Mode Active:</strong> You have read-only access. Modifications and additions are restricted to Editors and Admins.
            </span>
            <button
              type="button"
              onClick={onOpenRbacModal}
              className="underline font-semibold hover:text-amber-950 ml-1 cursor-pointer"
            >
              Switch Role
            </button>
          </div>
        )}

        {/* Navigation / View Mode Tabs */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-2 pb-2">
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
            <button
              id="nav-tab-table"
              type="button"
              onClick={() => onChangeViewMode('table')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Matrix View</span>
            </button>
            <button
              id="nav-tab-timeline"
              type="button"
              onClick={() => onChangeViewMode('timeline')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'timeline'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Timeline Cards</span>
            </button>
            <button
              id="nav-tab-analytics"
              type="button"
              onClick={() => onChangeViewMode('analytics')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'analytics'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Progress & Analytics</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Interactive checklist & evaluation slider</span>
          </div>
        </div>
      </div>
    </header>
  );
};
