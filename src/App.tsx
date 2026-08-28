import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherSubjects from './pages/teacher/Subjects';
import Login from './pages/auth/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';
import { AcademicSessionProvider } from './contexts/AcademicSessionContext';

import AdminLayout from './layouts/AdminLayout';
import AdminOverview from './pages/admin/Overview';
import AdminUsers from './pages/admin/Users';
import AdminClasses from './pages/admin/Classes';
import AdminAcademic from './pages/admin/Academic';
import AdminResults from './pages/admin/Results';
import AdminReports from './pages/admin/Reports';
import AdminSettings from './pages/admin/Settings';
import AdminParent from './pages/admin/Parent';
import AdminFees from './pages/admin/Fees';
import AdminBroadsheet from './pages/admin/Broadsheet';
import AdminCBT from './pages/admin/CBT';
import AdminLessonPlan from './pages/admin/LessonPlan';
import AdminMessaging from './pages/admin/Messaging';
import AdminTimetable from './pages/admin/Timetable';
import AdminAssessmentFormat from './pages/admin/AssessmentFormat';
import AdminExpenses from './pages/admin/Expenses';
import AdminInventory from './pages/admin/Inventory';
import AdminPayroll from './pages/admin/Payroll';
import AdminHelp from './pages/admin/Help';
import AdminStaff from './pages/admin/Staff';
import AdminTeachers from './pages/admin/Teachers';
import TeacherProfile from './pages/admin/TeacherProfile';
import Notifications from './pages/admin/Notifications';
import Profile from './pages/admin/Profile';
import OpenClass from './pages/admin/OpenClass';
import OpenArm from './pages/admin/OpenArm';
import StudentBio from './pages/admin/StudentBio';
import SubjectPage from './pages/admin/SubjectPage';
import SkillPage from './pages/admin/SkillPage';
import Students from './pages/admin/Students';
import AdminSubjects from './pages/admin/AdminSubjects';

// Teacher layout
import TeacherLayout from './layouts/TeacherLayout';

// Student test portal (public)
import TestPortal from './pages/student/TestPortal';

// Placeholder pages for other roles
const ParentDashboard = () => <div>Parent Dashboard</div>;
const StudentDashboard = () => <div>Student Dashboard</div>;

// Role‑based redirect component
const RoleBasedRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  switch (user.role) {
    case 'ADMIN': return <Navigate to="/admin" replace />;
    case 'TEACHER': return <Navigate to="/teacher" replace />;
    case 'PARENT': return <Navigate to="/parent" replace />;
    case 'STUDENT': return <Navigate to="/student" replace />;
    default: return <Navigate to="/login" replace />;
  }
};

function App() {
  return (
    <BrowserRouter>
      {/* Toaster is now outside the Routes so it's always available */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />

      <Routes>
        {/* Public routes – no layout */}
        <Route path="/login" element={<Login />} />
        <Route path="/student/test" element={<TestPortal />} />

        {/* Root redirect – protected */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<RoleBasedRedirect />} />
        </Route>

        {/* ====== ADMIN ROUTES ====== */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route
            path="/admin/*"
            element={
              <AcademicSessionProvider>
                <AdminLayout />
              </AcademicSessionProvider>
            }
          >
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="classes" element={<AdminClasses />} />
            <Route path="class/:id" element={<OpenClass />} />
            <Route path="class/:classId/arm/:armId" element={<OpenArm />} />
            <Route path="academic" element={<AdminAcademic />} />
            <Route path="results" element={<AdminResults />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="student/:id" element={<StudentBio />} />
            <Route path="subject/:id" element={<SubjectPage />} />
            <Route path="skill/:id" element={<SkillPage />} />
            <Route path="students" element={<Students />} />
            <Route path="subjects" element={<AdminSubjects />} />
            <Route path="teachers" element={<AdminTeachers />} />
            <Route path="teacher/:id" element={<TeacherProfile />} />
            <Route path="parent" element={<AdminParent />} />
            <Route path="fees" element={<AdminFees />} />
            <Route path="broadsheet" element={<AdminBroadsheet />} />
            <Route path="cbt" element={<AdminCBT />} />
            <Route path="lesson-plan" element={<AdminLessonPlan />} />
            <Route path="messaging" element={<AdminMessaging />} />
            <Route path="staff" element={<AdminStaff />} />
            <Route path="timetable" element={<AdminTimetable />} />
            <Route path="broadsheet" element={<AdminBroadsheet />} />
            <Route path="cbt" element={<AdminCBT />} />
            <Route path="assessment-format" element={<AdminAssessmentFormat />} />
            <Route path="expenses" element={<AdminExpenses />} />
            <Route path="inventory" element={<AdminInventory />} />
            <Route path="payroll" element={<AdminPayroll />} />
            <Route path="help" element={<AdminHelp />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Route>

        {/* ====== TEACHER ROUTES ====== */}
        <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
          <Route path="/teacher/*" element={<TeacherLayout />}>
            {/* Dashboard routes */}
            <Route index element={<TeacherDashboard />} />
            <Route path="dashboard" element={<TeacherDashboard />} />

            {/* Academic routes – same Classes page as admin, but teachers
                only see and manage classes assigned to them */}
            <Route path="classes" element={<AdminClasses />} />
            <Route path="class/:classId/arm/:armId" element={<OpenArm />} />
            <Route path="subjects" element={<TeacherSubjects />} />
            <Route path="subject/:id" element={<SubjectPage />} />
            <Route path="students" element={<Students />} />
            <Route path="results" element={<AdminResults />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="assessment-format" element={<AdminAssessmentFormat />} />
            <Route path="lesson-plan" element={<AdminLessonPlan />} />
            <Route path="timetable" element={<AdminTimetable />} />
            <Route path="broadsheet" element={<AdminBroadsheet />} />
            <Route path="cbt" element={<AdminCBT />} />

            {/* System routes */}
            <Route path="settings" element={<AdminSettings />} />
            <Route path="help" element={<AdminHelp />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Route>

        {/* ====== PARENT ROUTES ====== */}
        <Route element={<ProtectedRoute allowedRoles={['parent']} />}>
          <Route path="/parent/*" element={<ParentDashboard />} />
        </Route>

        {/* ====== STUDENT ROUTES ====== */}
        <Route element={<ProtectedRoute allowedRoles={['student']} />}>
          <Route path="/student/*" element={<StudentDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;