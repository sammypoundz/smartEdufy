// Central definition of the pages privileges that admins can grant to users
// (mainly teachers). Keys are stable identifiers stored on User.allowedPages;
// `href` is the teacher-side route; `adminHref` is the admin-side equivalent.
export interface PagePrivilege {
  key: string;
  label: string;
  href: string;
  adminHref: string;
}

export const PAGE_PRIVILEGES: PagePrivilege[] = [
  { key: 'classes', label: 'My Classes', href: '/teacher/classes', adminHref: '/admin/classes' },
  { key: 'subjects', label: 'My Subjects', href: '/teacher/subjects', adminHref: '/admin/subjects' },
  { key: 'students', label: 'Students', href: '/teacher/students', adminHref: '/admin/students' },
  { key: 'results', label: 'Results', href: '/teacher/results', adminHref: '/admin/results' },
  { key: 'reports', label: 'Reports', href: '/teacher/reports', adminHref: '/admin/reports' },
  { key: 'assessment-format', label: 'Assessment Format', href: '/teacher/assessment-format', adminHref: '/admin/assessment-format' },
  { key: 'lesson-plan', label: 'Lesson Plan', href: '/teacher/lesson-plan', adminHref: '/admin/lesson-plan' },
  { key: 'timetable', label: 'Timetable', href: '/teacher/timetable', adminHref: '/admin/timetable' },
  { key: 'broadsheet', label: 'Broadsheet', href: '/teacher/broadsheet', adminHref: '/admin/broadsheet' },
  { key: 'cbt', label: 'CBT', href: '/teacher/cbt', adminHref: '/admin/cbt' },
];

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
