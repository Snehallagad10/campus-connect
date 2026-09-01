import { useEffect, useState, useRef } from "react";
import { appointmentApi, session, teacherApi } from "../api/api";
import { formatTimeRange } from "../utils/istTime";

function StudentDashboard() {
  const student = session.get()?.user;
  const studentId = student?.id || student?._id || "";
  const [teachers, setTeachers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [form, setForm] = useState({
    teacherId: "",
    reason: "assignment",
    remarks: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [booking, setBooking] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const prevIsAvailableRef = useRef(undefined);

  const loadData = async () => {
    try {
      const [teachersResponse, appointmentsResponse] = await Promise.all([
        teacherApi.getAll(),
        appointmentApi.getAll(studentId ? { studentId } : { studentName: student?.fullName || "" }),
      ]);
      setTeachers(teachersResponse.data);
      setAppointments(appointmentsResponse.data);
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Unable to load dashboard data.");
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Poll every 5 seconds for real-time updates
    return () => clearInterval(interval);
  }, []);

  const selectedTeacher = teachers.find(
    (teacher) => teacher.id === form.teacherId || teacher._id === form.teacherId
  );

  useEffect(() => {
    if (selectedTeacher) {
      const isNowAvailable = selectedTeacher.isAvailable;
      const wasAvailable = prevIsAvailableRef.current;

      if (wasAvailable === false && isNowAvailable === true) {
        // Transitioned from Not Active to Active
        setToastMessage(`${selectedTeacher.name} Sir is free now!`);
      } else if (wasAvailable === true && isNowAvailable === false) {
        // Transitioned from Active to Not Active
        setToastMessage("");
      }

      prevIsAvailableRef.current = isNowAvailable;
    } else {
      prevIsAvailableRef.current = undefined;
      setToastMessage("");
    }
  }, [selectedTeacher]);

  const handleChange = (event) => {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBooking(true);
    setError("");
    setMessage("");

    try {
      const { data } = await appointmentApi.book({
        studentId,
        teacherId: form.teacherId,
        reason: form.reason,
        remarks: form.remarks,
      });
      setMessage(data.message);
      setForm({ teacherId: "", reason: "assignment", remarks: "" });
      loadData();
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Unable to book appointment.");
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="page-grid">
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            backgroundColor: "#22a96e",
            color: "white",
            padding: "16px 24px",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: "16px",
            fontWeight: "500",
            animation: "slideIn 0.3s ease-out",
          }}
        >
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage("")}
            style={{
              background: "none",
              border: "none",
              color: "white",
              cursor: "pointer",
              fontSize: "1.5rem",
              lineHeight: 1,
              padding: "0",
            }}
            aria-label="Close"
          >
            &times;
          </button>
        </div>
      )}

      <style>
        {`
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        `}
      </style>

      <div className="page-header">
        <div>
          <h1>Student Dashboard</h1>
          <p>Check live faculty slots, book appointments, and track request status.</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="card card--span-12">
          <h3>Book Appointment</h3>
          <form className="page-grid" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="book-teacher">Teacher</label>
              <select id="book-teacher" name="teacherId" value={form.teacherId} onChange={handleChange} required>
                <option value="">Select teacher</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id || teacher._id} value={teacher.id || teacher._id}>
                    {teacher.name} - {teacher.subject}
                  </option>
                ))}
              </select>
              {selectedTeacher ? (
                <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "0.88rem", color: "#31415c", fontWeight: 600 }}>Status:</span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      borderRadius: "999px",
                      padding: "4px 10px",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      background: selectedTeacher.isAvailable ? "#e7f7ee" : "#f3f4f6",
                      color: selectedTeacher.isAvailable ? "#117245" : "#6b7890",
                      border: selectedTeacher.isAvailable ? "1px solid #b2e4cc" : "1px solid #d1d5db",
                    }}
                  >
                    <span
                      style={{
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        background: selectedTeacher.isAvailable ? "#22a96e" : "#9ca3af",
                        flexShrink: 0,
                      }}
                    />
                    {selectedTeacher.isAvailable ? "Active" : "Not Active"}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="form-group">
              <label htmlFor="book-reason">Reason</label>
              <select id="book-reason" name="reason" value={form.reason} onChange={handleChange}>
                <option value="assignment">Assignment</option>
                <option value="practical">Practical</option>
                <option value="mini project">Mini Project</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="book-remarks">Remarks / Assignment</label>
              <textarea
                id="book-remarks"
                name="remarks"
                value={form.remarks}
                onChange={handleChange}
                placeholder="Example: Assignment-1, Experiment-3, Mini project review"
                required
              />
            </div>

            {selectedTeacher && selectedTeacher.isAvailable ? (
              <div className="card" style={{ padding: "16px" }}>
                <strong>{selectedTeacher.name}</strong>
                <p style={{ marginTop: "8px", color: "#61728d" }}>
                  {selectedTeacher.subject} | Lab {selectedTeacher.labNo || "--"} | {formatTimeRange(selectedTeacher.startTime, selectedTeacher.endTime)}
                </p>
              </div>
            ) : null}

            {message ? <div className="alert alert--success">{message}</div> : null}
            {error ? <div className="alert alert--error">{error}</div> : null}

            <button className="button" type="submit" disabled={booking}>
              {booking ? "Booking..." : "Book Appointment"}
            </button>
          </form>
        </section>

        <section className="card card--span-12">
          <div className="page-header">
            <div>
              <h3>Teacher Availability Board</h3>
              <p>Live status with subject, slot timing, and lab number.</p>
            </div>
          </div>

          <div className="list-card">
            {teachers.length ? (
              teachers.map((teacher) => (
                <article key={teacher.id || teacher._id} className="list-item">
                  <div>
                    <h4>{teacher.name}</h4>
                    <p>
                      {teacher.subject} | {teacher.isAvailable ? `${formatTimeRange(teacher.startTime, teacher.endTime)} | Lab ${teacher.labNo || "--"}` : "Currently unavailable"}
                    </p>
                  </div>
                  <span className={teacher.isAvailable ? "status-pill status-pill--available" : "status-pill status-pill--busy"}>
                    {teacher.isAvailable ? "Available" : "Unavailable"}
                  </span>
                </article>
              ))
            ) : (
              <div className="empty-state">No teachers registered yet.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default StudentDashboard;
