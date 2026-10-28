import { useEffect, useState } from "react";
import { appointmentApi, session } from "../api/api";

function TeacherHistory() {
  const teacher = session.get()?.user;
  const teacherId = teacher?.id || teacher?._id || "";
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        const query = teacherId
          ? { teacherId, includeAll: true }
          : { teacherName: teacher?.name || "", includeAll: true };
        const { data } = await appointmentApi.getAll(query);
        setAppointments(data);
      } catch (apiError) {
        setError(apiError.response?.data?.message || "Unable to load history.");
      }
    };

    loadAppointments();
  }, [teacher?.name, teacherId]);

  return (
    <div className="page-grid">
      <div className="page-header">
        <div>
          <h1>Teacher History</h1>
          <p>Track all appointment activity and completion status.</p>
        </div>
      </div>

      {error ? <div className="alert alert--error">{error}</div> : null}

      <section className="card">
        <div className="history-mobile-list">
          {appointments.map((appointment) => (
            <article key={appointment._id} className="history-mobile-card">
              <div className="history-mobile-card__top">
                <div>
                  <span className="history-mobile-card__label">Student</span>
                  <strong>{appointment.studentName || "--"}</strong>
                </div>
                <span className={appointment.status === "Completed" ? "status-pill status-pill--completed" : "status-pill status-pill--pending"}>
                  {appointment.status || "Pending"}
                </span>
              </div>
              <dl className="history-mobile-card__details">
                <div><dt>Class / Division</dt><dd>{appointment.classDiv || "--"}</dd></div>
                <div><dt>Reason</dt><dd>{appointment.reason || "--"}</dd></div>
                <div><dt>Booked date</dt><dd>{appointment.date || "--"}</dd></div>
                {(appointment.time || appointment.timeSlot || appointment.startTime) && (
                  <div><dt>Time</dt><dd>{appointment.time || appointment.timeSlot || appointment.startTime}</dd></div>
                )}
              </dl>
              {appointment.remarks && <p className="history-mobile-card__remark">{appointment.remarks}</p>}
            </article>
          ))}
          {!appointments.length && <div className="empty-state">No teacher appointment history available yet.</div>}
        </div>
        <div className="table-wrap history-desktop-table">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Class / Div</th>
                <th>Reason</th>
                <th>Booked Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length ? (
                appointments.map((appointment) => (
                  <tr key={appointment._id}>
                    <td>{appointment.studentName}</td>
                    <td>{appointment.classDiv}</td>
                    <td>{appointment.reason}</td>
                    <td>{appointment.date}</td>
                    <td>
                      <span
                        className={
                          appointment.status === "Completed"
                            ? "status-pill status-pill--completed"
                            : "status-pill status-pill--pending"
                        }
                      >
                        {appointment.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5">
                    <div className="empty-state">No teacher appointment history available yet.</div>
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

export default TeacherHistory;
