import { UserRole, PermissionAction, AppUser } from '../types';

export const ROLE_DEFINITIONS: Record<
  UserRole,
  {
    title: string;
    description: string;
    color: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
  }
> = {
  Admin: {
    title: 'Administrator',
    description: 'Full system control, task deletion, user role administration, and destructive sheet operations.',
    color: 'purple',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-200',
  },
  Editor: {
    title: 'Editor',
    description: 'Create and modify schedule items, check off subtasks, adjust progress, and sync to Google Sheets.',
    color: 'blue',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-200',
  },
  Viewer: {
    title: 'Viewer',
    description: 'Read-only access. Can inspect milestones, analytics, filter items, and export CSV reports.',
    color: 'slate',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    badgeBorder: 'border-slate-300',
  },
};

export const ROLE_PERMISSIONS: Record<UserRole, Record<PermissionAction, boolean>> = {
  Admin: {
    create_task: true,
    edit_task: true,
    delete_task: true,
    toggle_subtask: true,
    update_evaluation: true,
    add_subtask: true,
    export_csv: true,
    sync_sheets: true,
    import_sheets: true,
    manage_roles: true,
    set_reminder: true,
    tag_location: true,
  },
  Editor: {
    create_task: true,
    edit_task: true,
    delete_task: false, // Strictly restricted to Admin
    toggle_subtask: true,
    update_evaluation: true,
    add_subtask: true,
    export_csv: true,
    sync_sheets: true,
    import_sheets: false, // Destructive replace restricted to Admin
    manage_roles: false, // Role assignment restricted to Admin
    set_reminder: true,
    tag_location: true,
  },
  Viewer: {
    create_task: false,
    edit_task: false,
    delete_task: false,
    toggle_subtask: false,
    update_evaluation: false,
    add_subtask: false,
    export_csv: true,
    sync_sheets: false,
    import_sheets: false,
    manage_roles: false,
    set_reminder: false,
    tag_location: false,
  },
};

export const ACTION_DESCRIPTIONS: Record<
  PermissionAction,
  { label: string; minRole: UserRole; description: string }
> = {
  create_task: {
    label: 'Create Schedule Milestones',
    minRole: 'Editor',
    description: 'Add new days and action plans to the schedule.',
  },
  edit_task: {
    label: 'Modify Task Activities',
    minRole: 'Editor',
    description: 'Update existing schedules, titles, subtasks, and categories.',
  },
  delete_task: {
    label: 'Delete Schedule Milestones',
    minRole: 'Admin',
    description: 'Permanently remove schedule days and action items.',
  },
  toggle_subtask: {
    label: 'Check Off Action Items',
    minRole: 'Editor',
    description: 'Mark specific subtasks as completed or pending.',
  },
  update_evaluation: {
    label: 'Update Evaluation Progress',
    minRole: 'Editor',
    description: 'Adjust milestone completion percentages (0% - 100%).',
  },
  add_subtask: {
    label: 'Add Inline Action Item',
    minRole: 'Editor',
    description: 'Directly append new checklist items to a milestone.',
  },
  export_csv: {
    label: 'Download / Export CSV',
    minRole: 'Viewer',
    description: 'Export schedule data to local CSV file.',
  },
  sync_sheets: {
    label: 'Create & Sync Google Sheets',
    minRole: 'Editor',
    description: 'Push schedule data and update connected Google Sheets.',
  },
  import_sheets: {
    label: 'Import & Overwrite from Sheets',
    minRole: 'Admin',
    description: 'Destructively overwrite the local workspace with Google Sheet rows.',
  },
  manage_roles: {
    label: 'Manage Team Member Roles (RBAC)',
    minRole: 'Admin',
    description: 'Assign or modify permissions for team members.',
  },
  set_reminder: {
    label: 'Set Task Notification Reminders',
    minRole: 'Editor',
    description: 'Schedule automated Email and SMS/text phone reminders for upcoming tasks.',
  },
  tag_location: {
    label: 'Pin Live Location to Task',
    minRole: 'Editor',
    description: 'Attach real-time GPS coordinates and field inspection locations to tasks.',
  },
};

export const DEFAULT_USERS: AppUser[] = [
  {
    id: 'usr-kibrom',
    email: 'ab456kibrom@gmail.com',
    name: 'Kibrom (Team Lead)',
    role: 'Admin',
  },
  {
    id: 'usr-assaye',
    email: 'assaye.maintenance@example.com',
    name: 'Assaye (Operations)',
    role: 'Editor',
  },
  {
    id: 'usr-supervisor',
    email: 'supervisor.auditor@example.com',
    name: 'Field Auditor',
    role: 'Viewer',
  },
];

export const hasPermission = (role: UserRole, action: PermissionAction): boolean => {
  return !!ROLE_PERMISSIONS[role]?.[action];
};
