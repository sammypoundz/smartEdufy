// Central definition of the page privileges that admins can grant to users.
// Keys are stable identifiers stored on User.allowedPages and RoleDef.privileges.
// Mirrors backend/src/utils/privileges.ts — keep both in sync.
export interface PagePrivilege {
  key: string;
  label: string;
  group: string;
  href?: string;
  adminHref?: string;
}

export const ALL_PRIVILEGES: PagePrivilege[] = [
  // Academic
  { key: 'classes', label: 'Classes', group: 'Academic', href: '/teacher/classes', adminHref: '/admin/classes' },
  { key: 'subjects', label: 'Subjects', group: 'Academic', href: '/teacher/subjects', adminHref: '/admin/subjects' },
  { key: 'students', label: 'Students', group: 'Academic', href: '/teacher/students', adminHref: '/admin/students' },
  { key: 'results', label: 'Results', group: 'Academic', href: '/teacher/results', adminHref: '/admin/results' },
  { key: 'reports', label: 'Reports', group: 'Academic', href: '/teacher/reports', adminHref: '/admin/reports' },
  { key: 'broadsheet', label: 'Broadsheet', group: 'Academic', href: '/teacher/broadsheet', adminHref: '/admin/broadsheet' },
  { key: 'assessment-format', label: 'Assessment Format', group: 'Academic', href: '/teacher/assessment-format', adminHref: '/admin/assessment-format' },
  { key: 'lesson-plan', label: 'Lesson Plan', group: 'Academic', href: '/teacher/lesson-plan', adminHref: '/admin/lesson-plan' },
  { key: 'timetable', label: 'Timetable', group: 'Academic', href: '/teacher/timetable', adminHref: '/admin/timetable' },
  { key: 'cbt', label: 'CBT', group: 'Academic', href: '/teacher/cbt', adminHref: '/admin/cbt' },
  { key: 'academic', label: 'Academic Sessions', group: 'Academic', adminHref: '/admin/academic' },
  // Finance
  { key: 'fees', label: 'Fees', group: 'Finance', adminHref: '/admin/fees' },
  { key: 'expenses', label: 'Expenses', group: 'Finance', adminHref: '/admin/expenses' },
  { key: 'payroll', label: 'Payroll', group: 'Finance', adminHref: '/admin/payroll' },
  // People / HR
  { key: 'staff', label: 'Staff', group: 'People', adminHref: '/admin/staff' },
  { key: 'teachers', label: 'Teachers', group: 'People', adminHref: '/admin/teachers' },
  { key: 'parents', label: 'Parents', group: 'People', adminHref: '/admin/parent' },
  { key: 'messaging', label: 'Messaging', group: 'People', adminHref: '/admin/messaging' },
  // Administration
  { key: 'users', label: 'User Management', group: 'Administration', adminHref: '/admin/users' },
  { key: 'roles', label: 'Roles & Privileges', group: 'Administration', adminHref: '/admin/roles' },
  { key: 'inventory', label: 'Inventory', group: 'Administration', adminHref: '/admin/inventory' },
  { key: 'settings', label: 'Settings', group: 'Administration', adminHref: '/admin/settings', href: '/teacher/settings' },
];

// Legacy alias — the short academic keys used by the teacher UI.
export const PAGE_PRIVILEGES: PagePrivilege[] = ALL_PRIVILEGES;

// Privileges classified by (system) role — used in the UI to show which
// privileges belong to which role. Custom roles are user-defined.
export const SYSTEM_ROLE_PRIVILEGES: Record<string, string[]> = {
  ADMIN: ALL_PRIVILEGES.map(p => p.key),
  PRINCIPAL: ALL_PRIVILEGES.map(p => p.key),
  VICE_PRINCIPAL: [
    'classes', 'subjects', 'students', 'results', 'reports', 'broadsheet',
    'assessment-format', 'lesson-plan', 'timetable', 'cbt', 'academic',
    'staff', 'teachers', 'messaging',
  ],
  TEACHER: [
    'classes', 'subjects', 'students', 'results', 'reports', 'broadsheet',
    'assessment-format', 'lesson-plan', 'timetable', 'cbt',
  ],
  BURSAR: ['fees', 'expenses', 'reports', 'inventory'],
  ACCOUNTANT: ['fees', 'expenses', 'reports', 'payroll'],
  LIBRARIAN: ['inventory', 'students'],
  PARENT: [],
  STUDENT: [],
};

// Reverse lookup: privilege key -> roles that carry it by default.
export const ROLES_BY_PRIVILEGE: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = {};
  for (const [role, privs] of Object.entries(SYSTEM_ROLE_PRIVILEGES)) {
    for (const p of privs) {
      if (!map[p]) map[p] = [];
      map[p].push(role);
    }
  }
  return map;
})();

// Route mapping: privilege key -> routes it unlocks (admin + teacher sides).
export const PRIVILEGE_ROUTES: Record<string, string[]> = Object.fromEntries(
  ALL_PRIVILEGES.map(p => [
    p.key,
    [
      p.adminHref,
      p.href,
      // Detail pages hang off the list pages
      ...(p.key === 'classes' ? ['/admin/class', '/teacher/class'] : []),
      ...(p.key === 'students' ? ['/admin/student'] : []),
      ...(p.key === 'subjects' ? ['/admin/subject', '/teacher/subject'] : []),
      ...(p.key === 'teachers' ? ['/admin/teacher'] : []),
    ].filter(Boolean) as string[],
  ])
);

// Always-available pages (Dashboard, Settings, Help, Notifications, Profile)
export const TEACHER_ALWAYS_ALLOWED_HREFS = [
  '/teacher',
  '/teacher/dashboard',
  '/teacher/settings',
  '/teacher/help',
  '/teacher/notifications',
  '/teacher/profile',
];

export const hasPagePrivilege = (allowedPages: string[] | undefined | null, key: string): boolean => {
  return Array.isArray(allowedPages) && allowedPages.includes(key);
};

// Compute the effective privilege set for a user.
// ADMIN / PRINCIPAL implicitly hold everything.
// For everyone else: if the admin saved an explicit page list (allowedPages),
// that list IS the user's access (override — only those pages show).
// If the list is empty, the user falls back to their role defaults.
export const effectivePrivileges = (opts: {
  roles?: string[];
  privileges?: string[];
  allowedPages?: string[];
}): string[] => {
  const hasFullAccess = (opts.roles || []).some(r => r === 'ADMIN' || r === 'PRINCIPAL');
  if (hasFullAccess) return ALL_PRIVILEGES.map(p => p.key);
  // Admin-defined override: an explicit list wins over role defaults.
  if (Array.isArray(opts.allowedPages) && opts.allowedPages.length > 0) {
    return [...new Set(opts.allowedPages)];
  }
  // No explicit list — use role defaults (backend-resolved privileges).
  const set = new Set<string>();
  for (const p of opts.privileges || []) set.add(p);
  return [...set];
};
