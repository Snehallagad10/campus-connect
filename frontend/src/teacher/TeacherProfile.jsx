import { session } from "../api/api";
import { formatTimeRange } from "../utils/istTime";

function TeacherProfile({ onLogout }) {
  const teacher = session.get()?.user;
  const teacherName = teacher?.name || "Teacher";
  const initials = teacherName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "T";
  const liveSlot =
    teacher?.startTime && teacher?.endTime ? formatTimeRange(teacher.startTime, teacher.endTime) : "Not configured";
  const basicInfo = [
    { label: "Faculty Name", value: teacher?.name || "--" },
    { label: "Subject", value: teacher?.subject || "--" },
    { label: "Email", value: teacher?.email || "--" },
    { label: "Lab Number", value: teacher?.labNo || "--" },
  ];
  const accountInfo = [
    { label: "Availability", value: teacher?.isAvailable ? "Available" : "Unavailable" },
    { label: "Live Slot", value: liveSlot },
    { label: "Portal Role", value: "Teacher" },
  ];

  return (
    <div className="page-grid">
      <div className="page-header">
        <div>
          <h1>Account Settings</h1>
          <p>Review the faculty details and slot information shown across the teacher portal.</p>
        </div>
      </div>

      <section className="card profile-settings">
        <div className="profile-settings__main">
          <div className="profile-settings__section">
            <h2>Basic info</h2>

            <div className="profile-settings__hero">
              <div className="profile-avatar profile-avatar--teacher">{initials}</div>
              <div>
                <strong>{teacherName}</strong>
                <p>Faculty profile used for appointments, availability, and marks workflow.</p>
              </div>
            </div>

            <div className="profile-settings__list">
              {basicInfo.map((item) => (
                <article key={item.label} className="profile-settings__row">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <i aria-hidden="true">›</i>
                </article>
              ))}
            </div>
          </div>

          <div className="profile-settings__section">
            <h2>Account info</h2>

            <div className="profile-settings__list">
              {accountInfo.map((item) => (
                <article key={item.label} className="profile-settings__row">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <i aria-hidden="true">›</i>
                </article>
              ))}
            </div>
          </div>

          <aside className="profile-settings__aside">
            <div className="profile-settings__aside-icon">T</div>
            <h3>Faculty account</h3>
            <p>
              Your subject, lab, and time slot are shown to students while booking appointments.
            </p>
            <div className="profile-settings__aside-meta">
              <span>{teacher?.subject || "--"}</span>
              <span>{teacher?.isAvailable ? "Live Now" : "Offline"}</span>
            </div>
          </aside>
        </div>
        <div className="profile-logout-row">
          <button type="button" className="button-secondary profile-logout" onClick={onLogout}>
            Logout
          </button>
        </div>
      </section>
    </div>
  );
}

export default TeacherProfile;
