import React from 'react';
import { ShieldAlert, X, Lock, CheckCircle2 } from 'lucide-react';
import { UserRole, PermissionAction } from '../types';
import { ROLE_DEFINITIONS, ACTION_DESCRIPTIONS } from '../services/rbac';

interface AccessDeniedModalProps {
  isOpen: boolean;
  action: PermissionAction | null;
  currentRole: UserRole;
  onClose: () => void;
  onRequestRoleChange?: () => void;
}

export const AccessDeniedModal: React.FC<AccessDeniedModalProps> = ({
  isOpen,
  action,
  currentRole,
  onClose,
  onRequestRoleChange,
}) => {
  if (!isOpen || !action) return null;

  const actionMeta = ACTION_DESCRIPTIONS[action] || {
    label: 'Restricted Action',
    minRole: 'Admin' as UserRole,
    description: 'This action is restricted by Role-Based Access Control.',
  };

  const currentRoleMeta = ROLE_DEFINITIONS[currentRole];
  const requiredRoleMeta = ROLE_DEFINITIONS[actionMeta.minRole];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-rose-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-rose-700 text-white">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Access Restricted (RBAC)</h2>
              <p className="text-xs text-rose-100">Insufficient Permissions</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-rose-200 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{actionMeta.label}</h3>
              <p className="text-xs text-slate-500 mt-1">{actionMeta.description}</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-600 font-medium">Your Current Role:</span>
              <span
                className={`px-2.5 py-0.5 rounded-full font-bold border ${currentRoleMeta.badgeBg} ${currentRoleMeta.badgeText} ${currentRoleMeta.badgeBorder}`}
              >
                {currentRole}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50 border border-amber-200">
              <span className="text-amber-900 font-medium">Required Role:</span>
              <span
                className={`px-2.5 py-0.5 rounded-full font-bold border ${requiredRoleMeta.badgeBg} ${requiredRoleMeta.badgeText} ${requiredRoleMeta.badgeBorder}`}
              >
                {actionMeta.minRole}
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 leading-relaxed border border-slate-100">
            <span className="font-semibold text-slate-800">Role Policies:</span>
            <ul className="mt-1.5 space-y-1 list-disc pl-4 text-[11px] text-slate-500">
              <li>
                <strong className="text-slate-700">Viewer:</strong> Read-only access to schedules and reports.
              </li>
              <li>
                <strong className="text-slate-700">Editor:</strong> Can create tasks, toggle subtasks, and adjust progress.
              </li>
              <li>
                <strong className="text-slate-700">Admin:</strong> Full control, milestone deletion, and role management.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          {onRequestRoleChange && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onRequestRoleChange();
              }}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Manage / Switch Roles
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
