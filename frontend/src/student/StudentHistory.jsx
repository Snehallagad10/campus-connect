import { useEffect, useState } from "react";
import { appointmentApi, session } from "../api/api";

const getAppointmentKey = (appointment) =>
  [
    appointment.studentId || appointment.studentName || "",
    appointment.teacherId || appointment.teacherName || "",
    appointment.reason || "",
    (appointment.remarks || "").trim().toLowerCase(),
  ].join("::");

const dedupeAppointments = (items) => {
  const seen = new Set();

  return items.filter((appointment) => {
    const key = getAppointmentKey(appointment);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

function StudentHistory() {
  const student = session.get()?.user;
  const studentId = student?.id || student?._id || "";
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const query = studentId ? { studentId } : { studentName: student?.fullName || "" };
        const { data } = await appointmentApi.getAll(query);
        setAppointments(dedupeAppointments(data));
      } catch (apiError) {
        setError(apiError.response?.data?.message || "Unable to load history.");
      }
    };

    loadHistory();
  }, [student?.fullName, studentId]);

  return (
    <div className="page-grid">
      <div className="page-header">
        <div>
          <h1>Student History</h1>
          <p>Review all appointment bookings and current statuses.</p>
        </div>
      </div>

      {error ? <div className="alert alert--error">{error}</div> : null}

      <section className="card">
        <div className="history-mobile-list">
          {appointments.map((appointment) => (
            <article key={appointment._id} className="history-mobile-card">
              <div className="history-mobile-card__top">
                <div>
                  <span className="history-mobile-card__label">Teacher</span>
                  <strong>{appointment.teacherName || "--"}</strong>
                </div>
                <span className={appointment.status === "Completed" ? "status-pill status-pill--completed" : "status-pill status-pill--pending"}>
                  {appointment.status || "Pending"}
                </span>
              </div>
              <dl className="history-mobile-card__details">
                <div><dt>Reason</dt><dd>{appointment.reason || "--"}</dd></div>
                <div><dt>Class / Division</dt><dd>{appointment.classDiv || "--"}</dd></div>
                <div><dt>Booked date</dt><dd>{appointment.date || "--"}</dd></div>
                {(appointment.time || appointment.timeSlot || appointment.startTime) && (
                  <div><dt>Time</dt><dd>{appointment.time || appointment.timeSlot || appointment.startTime}</dd></div>
                )}
              </dl>
              {appointment.remarks && <p className="history-mobile-card__remark">{appointment.remarks}</p>}
            </article>
          ))}
          {!appointments.length && <div className="empty-state">No appointments booked yet.</div>}
        </div>
        <div className="table-wrap history-desktop-table">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Teacher</th>
                <th>Reason</th>
                <th>Class / Div</th>
                <th>Booked Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length ? (
                appointments.map((appointment) => (
                  <tr key={appointment._id}>
                    <td>{appointment.teacherName}</td>
                    <td>{appointment.reason}</td>
                    <td>{appointment.classDiv}</td>
                    <td>{appointment.date}</td>
                    <td>
                      <span className={appointment.status === "Completed" ? "status-pill status-pill--completed" : "status-pill status-pill--pending"}>
                        {appointment.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5">
                    <div className="empty-state">No appointments booked yet.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default StudentHistory;
