import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import { session } from "./api/api";
import TeacherLogin from "./teacher/TeacherLogin";
import TeacherRegister from "./teacher/TeacherRegister";
import TeacherDashboard from "./teacher/TeacherDashboard";
import TeacherHistory from "./teacher/TeacherHistory";
import TeacherProfile from "./teacher/TeacherProfile";
import StudentLogin from "./student/StudentLogin";
import StudentRegister from "./student/StudentRegister";
import StudentDashboard from "./student/StudentDashboard";
import StudentHistory from "./student/StudentHistory";
import StudentProfile from "./student/StudentProfile";
import AuthPortal from "./pages/AuthPortal";
import MarksFeedback from "./pages/MarksFeedback";
import StudentMarksReport from "./pages/StudentMarksReport";
import "./App.css";

function ProtectedLayout({ allowedRole, children }) {
  const navigate = useNavigate();
  const currentSession = session.get();

  if (!currentSession) {
    return <Navigate to={allowedRole === "teacher" ? "/teacher-login" : "/student-login"} replace />;
  }

  if (allowedRole && currentSession.role !== allowedRole) {
    return (
      <Navigate
        to={currentSession.role === "teacher" ? "/teacher-dashboard" : "/student-dashboard"}
        replace
      />
    );
  }

  const handleLogout = () => {
    const currentRole = currentSession.role;
    session.clear();
    navigate(currentRole === "teacher" ? "/teacher-login" : "/student-login");
  };

  const userName =
    currentSession.role === "teacher"
      ? currentSession.user.name
      : currentSession.user.fullName;

  return (
    <div className="app-shell">
      <Sidebar
        role={currentSession.role}
        userName={userName}
        onLogout={handleLogout}
      />
      <main className="app-content">{children}</main>
    </div>
  );
}

function RootRoute() {
  const currentSession = session.get();

  if (!currentSession) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Navigate
      to={currentSession.role === "teacher" ? "/teacher-dashboard" : "/student-dashboard"}
      replace
    />
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/login" element={<AuthPortal mode="login" />} />
        <Route path="/register" element={<AuthPortal mode="register" />} />
        <Route path="/teacher-login" element={<AuthPortal mode="login" defaultRole="teacher" />} />
        <Route path="/teacher-register" element={<AuthPortal mode="register" defaultRole="teacher" />} />
        <Route
          path="/teacher-dashboard"
          element={
            <ProtectedLayout allowedRole="teacher">
              <TeacherDashboard />
            </ProtectedLayout>
          }
        />
        <Route
          path="/teacher-history"
          element={
            <ProtectedLayout allowedRole="teacher">
              <TeacherHistory />
            </ProtectedLayout>
          }
        />
        <Route
          path="/teacher-profile"
          element={
            <ProtectedLayout allowedRole="teacher">
              <TeacherProfile />
            </ProtectedLayout>
          }
        />
        <Route
          path="/marks-feedback"
          element={
            <ProtectedLayout allowedRole="teacher">
              <MarksFeedback />
            </ProtectedLayout>
          }
        />
        <Route path="/student-login" element={<AuthPortal mode="login" defaultRole="student" />} />
        <Route path="/student-register" element={<AuthPortal mode="register" defaultRole="student" />} />
        <Route
          path="/student-dashboard"
          element={
            <ProtectedLayout allowedRole="student">
              <StudentDashboard />
            </ProtectedLayout>
          }
        />
        <Route
          path="/student-history"
          element={
            <ProtectedLayout allowedRole="student">
              <StudentHistory />
            </ProtectedLayout>
          }
        />
        <Route
          path="/student-profile"
          element={
            <ProtectedLayout allowedRole="student">
              <StudentProfile />
            </ProtectedLayout>
          }
        />
        <Route
          path="/student-marks-report"
          element={
            <ProtectedLayout>
              <StudentMarksReport />
            </ProtectedLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
