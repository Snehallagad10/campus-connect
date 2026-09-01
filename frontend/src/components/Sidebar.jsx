import { NavLink } from "react-router-dom";
import "./Sidebar.css";

function Sidebar({ role, userName, onLogout }) {
  const navItems =
    role === "teacher"
      ? [
          { label: "Dashboard", path: "/teacher-dashboard" },
          { label: "History", path: "/teacher-history" },
          { label: "Profile", path: "/teacher-profile" },
          { label: "Marks Report", path: "/student-marks-report" },
        ]
      : [
          { label: "Dashboard", path: "/student-dashboard" },
          { label: "History", path: "/student-history" },
          { label: "Profile", path: "/student-profile" },
          { label: "Marks Report", path: "/student-marks-report" },
        ];

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__brand-mark" aria-hidden="true">
          {role === "teacher" ? "T" : "S"}
        </div>
        <div>
          <span className="sidebar__eyebrow">Academic Portal</span>
          <h1>{role === "teacher" ? "Faculty Workspace" : "Student Workspace"}</h1>
          <p>Appointments, records, and marks in one place.</p>
        </div>
      </div>

      <div className="sidebar__user">
        <div className="sidebar__avatar">{userName?.charAt(0) || "U"}</div>
        <div>
          <strong>{userName}</strong>
          <p>{role === "teacher" ? "Teacher Portal" : "Student Portal"}</p>
        </div>
      </div>

      <nav className="sidebar__nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              isActive ? "sidebar__link sidebar__link--active" : "sidebar__link"
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <button type="button" className="sidebar__logout" onClick={onLogout}>
        Logout
      </button>
    </aside>
  );
}

export default Sidebar;
