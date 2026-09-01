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

function TeacherHistory() {
  const teacher = session.get()?.user;
  const teacherId = teacher?.id || teacher?._id || "";
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        const query = teacherId ? { teacherId } : { teacherName: teacher?.name || "" };
        const { data } = await appointmentApi.getAll(query);
        setAppointments(dedupeAppointments(data));
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
        <div className="table-wrap">
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
