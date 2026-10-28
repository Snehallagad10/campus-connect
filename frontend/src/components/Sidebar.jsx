import { NavLink, useLocation } from "react-router-dom";
import "./Sidebar.css";

function Sidebar({ role, onLogout }) {
  const location = useLocation();
  const navItems =
    role === "teacher"
      ? [
          { label: "Dashboard", path: "/teacher-dashboard" },
          { label: "Requests", path: "/teacher-history" },
          { label: "Profile", path: "/teacher-profile" },
          { label: "Marks Report", path: "/student-marks-report" },
        ]
      : [
          { label: "Dashboard", path: "/student-dashboard" },
          { label: "History", path: "/student-history" },
          { label: "Marks Report", path: "/student-marks-report" },
          { label: "Profile", path: "/student-profile" },
        ];
  const icons = [
    <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
    <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    <><path d="M5 3h10l4 4v14H5z" /><path d="M15 3v5h4M8 13h8M8 17h8" /></>,
  ];

  const isItemActive = (item) => {
    if (role === "teacher") {
      if (item.label === "Dashboard") return location.pathname === item.path;
      if (item.label === "Requests") return location.pathname === "/teacher-history" || location.pathname === "/marks-feedback";
    }
    return location.pathname === item.path;
  };

  return (
    <aside
      className={[
        "sidebar",
        role === "student" ? "sidebar--student" : "",
        role === "teacher" ? "sidebar--teacher" : "",
        role === "teacher" && location.pathname === "/teacher-profile" ? "sidebar--teacher-profile" : "",
      ].filter(Boolean).join(" ")}
    >
      <nav className="sidebar__nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={isItemActive(item) ? "sidebar__link sidebar__link--active" : "sidebar__link"}
            end
          >
            <span className="sidebar__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {icons[
                role === "student" && item.label === "Marks Report"
                  ? 3
                  : role === "student" && item.label === "Profile"
                    ? 2
                    : navItems.indexOf(item)
              ]}
              </svg>
            </span>
            <span className="sidebar__label">
              {item.label}
            </span>
          </NavLink>
        ))}
      </nav>

      {role === "teacher" ? (
        <button type="button" className="sidebar__logout" onClick={onLogout}>
          Logout
        </button>
      ) : null}
    </aside>
  );
}

export default Sidebar;
