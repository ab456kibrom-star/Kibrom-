import React, { useState } from 'react';
import {
  ShieldCheck,
  X,
  UserPlus,
  Users,
  Check,
  Minus,
  Crown,
  Edit,
  Eye,
  Info,
  Shield,
  Sparkles,
} from 'lucide-react';
import { UserRole, AppUser, PermissionAction } from '../types';
import {
  ROLE_DEFINITIONS,
  ROLE_PERMISSIONS,
  ACTION_DESCRIPTIONS,
} from '../services/rbac';

interface RbacManagementModalProps {
  isOpen: boolean;
  currentUserRole: UserRole;
  users: AppUser[];
  activeUserId: string | null;
  onClose: () => void;
  onUpdateUserRole: (userId: string, newRole: UserRole) => void;
  onAddUser: (name: string, email: string, role: UserRole) => void;
  onSwitchActiveRole: (role: UserRole) => void;
}

export const RbacManagementModal: React.FC<RbacManagementModalProps> = ({
  isOpen,
  currentUserRole,
  users,
  activeUserId,
  onClose,
  onUpdateUserRole,
  onAddUser,
  onSwitchActiveRole,
}) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'users' | 'add'>('matrix');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('Editor');
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isAdmin = currentUserRole === 'Admin';

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setAddSuccess(null);
    setAddError(null);

    if (!newName.trim() || !newEmail.trim()) {
      setAddError('Please fill in both name and email.');
      return;
    }

    if (users.some((u) => u.email.toLowerCase() === newEmail.trim().toLowerCase())) {
      setAddError('A user with this email address already exists.');
      return;
    }

    onAddUser(newName.trim(), newEmail.trim().toLowerCase(), newRole);
    setAddSuccess(`User ${newName} added with ${newRole} role.`);
    setNewName('');
    setNewEmail('');
    setNewRole('Editor');
  };

  const actionsList: PermissionAction[] = [
    'create_task',
    'edit_task',
    'delete_task',
    'toggle_subtask',
    'update_evaluation',
    'add_subtask',
    'export_csv',
    'import_csv',
    'sync_sheets',
    'import_sheets',
    'manage_roles',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Role-Based Access Control (RBAC)</h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-700 text-indigo-200">
                  Active: {currentUserRole}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Manage user permissions, view access matrix, and test roles
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Simulator Banner (allows testing Admin, Editor, Viewer instantly) */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="font-semibold">Quick Role Switcher (Live Test):</span>
            <span className="text-slate-500">Switch current session role to preview UX</span>
          </div>
          <div className="inline-flex rounded-lg bg-white border border-slate-200 p-0.5 shadow-2xs">
            {(['Admin', 'Editor', 'Viewer'] as UserRole[]).map((role) => {
              const isCurrent = currentUserRole === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => onSwitchActiveRole(role)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                    isCurrent
                      ? role === 'Admin'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : role === 'Editor'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {role === 'Admin' && <Crown className="w-3 h-3" />}
                  {role === 'Editor' && <Edit className="w-3 h-3" />}
                  {role === 'Viewer' && <Eye className="w-3 h-3" />}
                  <span>{role}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 px-6 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'matrix'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Permissions Matrix</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'users'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Team Members ({users.length})</span>
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('add')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'add'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Assign New User</span>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* TAB 1: PERMISSIONS MATRIX */}
          {activeTab === 'matrix' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(['Admin', 'Editor', 'Viewer'] as UserRole[]).map((r) => {
                  const meta = ROLE_DEFINITIONS[r];
                  return (
                    <div
                      key={r}
                      className={`p-3.5 rounded-xl border ${meta.badgeBorder} ${
                        currentUserRole === r ? 'ring-2 ring-indigo-500 bg-white shadow-xs' : 'bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}>
                          {meta.title}
                        </span>
                        {currentUserRole === r && (
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                            Your Role
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                        {meta.description}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Matrix Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-semibold">
                      <th className="py-2.5 px-4">Application Feature / Permission</th>
                      <th className="py-2.5 px-3 text-center w-24">Admin</th>
                      <th className="py-2.5 px-3 text-center w-24">Editor</th>
                      <th className="py-2.5 px-3 text-center w-24">Viewer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {actionsList.map((action, idx) => {
                      const desc = ACTION_DESCRIPTIONS[action];
                      const canAdmin = ROLE_PERMISSIONS.Admin[action];
                      const canEditor = ROLE_PERMISSIONS.Editor[action];
                      const canViewer = ROLE_PERMISSIONS.Viewer[action];

                      return (
                        <tr
                          key={action}
                          className={idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}
                        >
                          <td className="py-2.5 px-4">
                            <div className="font-semibold text-slate-800">{desc.label}</div>
                            <div className="text-[11px] text-slate-400">{desc.description}</div>
                          </td>

                          {/* Admin */}
                          <td className="py-2.5 px-3 text-center">
                            {canAdmin ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700">
                                <Check className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-400">
                                <Minus className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </td>

                          {/* Editor */}
                          <td className="py-2.5 px-3 text-center">
                            {canEditor ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700">
                                <Check className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-400">
                                <Minus className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </td>

                          {/* Viewer */}
                          <td className="py-2.5 px-3 text-center">
                            {canViewer ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700">
                                <Check className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-400">
                                <Minus className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: TEAM MEMBERS ROSTER */}
          {activeTab === 'users' && (
            <div className="space-y-3">
              {!isAdmin && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Role assignment changes are restricted to <strong>Admin</strong> users. As a {currentUserRole}, you can view the team roster.
                  </span>
                </div>
              )}

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Assigned Role</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((user) => {
                      const roleMeta = ROLE_DEFINITIONS[user.role];
                      const isSelf = user.id === activeUserId;

                      return (
                        <tr key={user.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              <span>{user.name}</span>
                              {isSelf && (
                                <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-normal">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">{user.email}</div>
                          </td>

                          <td className="py-3 px-4">
                            {isAdmin ? (
                              <select
                                value={user.role}
                                onChange={(e) =>
                                  onUpdateUserRole(user.id, e.target.value as UserRole)
                                }
                                className="px-2.5 py-1 text-xs border border-slate-300 rounded-md font-semibold bg-white focus:ring-1 focus:ring-indigo-500"
                              >
                                <option value="Admin">Admin (Full Access)</option>
                                <option value="Editor">Editor (Create & Modify)</option>
                                <option value="Viewer">Viewer (Read-Only)</option>
                              </select>
                            ) : (
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full font-bold border ${roleMeta.badgeBg} ${roleMeta.badgeText} ${roleMeta.badgeBorder}`}
                              >
                                {user.role}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => onSwitchActiveRole(user.role)}
                              className="text-indigo-600 hover:text-indigo-900 font-medium text-xs hover:underline"
                            >
                              Simulate Role
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: ADD USER (ADMIN ONLY) */}
          {activeTab === 'add' && isAdmin && (
            <form onSubmit={handleCreateUser} className="space-y-4 max-w-md mx-auto">
              {addSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{addSuccess}</span>
                </div>
              )}
              {addError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                  <X className="w-4 h-4 text-rose-600" />
                  <span>{addError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Samuel Maintenance"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="user@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Role Assignment
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                >
                  <option value="Admin">Admin (Full Access & Delete)</option>
                  <option value="Editor">Editor (Create & Modify)</option>
                  <option value="Viewer">Viewer (Read-Only)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  {ROLE_DEFINITIONS[newRole].description}
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Assign Role to User</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Enforcing strict RBAC with least-privilege principles</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
