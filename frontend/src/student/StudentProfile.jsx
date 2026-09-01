import { session } from "../api/api";

function StudentProfile() {
  const student = session.get()?.user;
  const studentName = student?.fullName || "Student";
  const initials = studentName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "S";
  const basicInfo = [
    { label: "Full Name", value: student?.fullName || "--" },
    { label: "Academic Year", value: student?.year || "--" },
    { label: "Division", value: student?.division || "--" },
    { label: "Email", value: student?.email || "--" },
  ];
  const accountInfo = [
    { label: "Portal Role", value: "Student" },
    { label: "Account Status", value: "Active" },
    { label: "Marks Access", value: "Enabled" },
  ];

  return (
    <div className="page-grid">
      <div className="page-header">
        <div>
          <h1>Account Settings</h1>
          <p>Review the academic details and account information used across the student portal.</p>
        </div>
      </div>

      <section className="card profile-settings">
        <div className="profile-settings__main">
          <div className="profile-settings__section">
            <h2>Basic info</h2>

            <div className="profile-settings__hero">
              <div className="profile-avatar profile-avatar--student">{initials}</div>
              <div>
                <strong>{studentName}</strong>
                <p>Student profile linked to appointments, reports, and marks visibility.</p>
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
            <div className="profile-settings__aside-icon">S</div>
            <h3>Student account</h3>
            <p>
              Your year, division, and email are used for booking requests and marks records.
            </p>
            <div className="profile-settings__aside-meta">
              <span>{student?.year || "--"} / {student?.division || "--"}</span>
              <span>Portal Ready</span>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

export default StudentProfile;
