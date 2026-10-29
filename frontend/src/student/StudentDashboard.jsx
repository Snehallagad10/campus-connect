import { useEffect, useState } from "react";
import { appointmentApi, session, teacherApi } from "../api/api";
import NotificationBell from "../components/NotificationBell";
import {
  formatCurrentIstTime,
  formatLabNumber,
  isTeacherAvailableNow,
  isValidAvailabilitySlot,
  normalizeTimeInput,
} from "../utils/istTime";
import "./StudentDashboard.css";

function StudentDashboard() {
  const student = session.get()?.user;
  const studentId = student?.id || student?._id || "";
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState({
    teacherId: "",
    reason: "assignment",
    remarks: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [booking, setBooking] = useState(false);
  const loadData = async () => {
    try {
      const teachersResponse = await teacherApi.getAll();
      const nextTeachers = teachersResponse.data;
      setTeachers(nextTeachers);
      setError("");
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
  const currentIstTime = formatCurrentIstTime();
  const selectedTeacherAvailable = isTeacherAvailableNow(selectedTeacher, currentIstTime);
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
      <div className="page-header">
        <div>
          <h1>Student Dashboard</h1>
          <p>Check live faculty slots, book appointments, and track request status.</p>
        </div>
        <NotificationBell
          userId={studentId}
          role="student"
          onAvailability={(teacherId) => setForm((previous) => ({ ...previous, teacherId }))}
        />
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
                      background: selectedTeacherAvailable ? "#e7f7ee" : "#f3f4f6",
                      color: selectedTeacherAvailable ? "#117245" : "#6b7890",
                      border: selectedTeacherAvailable ? "1px solid #b2e4cc" : "1px solid #d1d5db",
                    }}
                  >
                    <span
                      style={{
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        background: selectedTeacherAvailable ? "#22a96e" : "#9ca3af",
                        flexShrink: 0,
                      }}
                    />
                    {selectedTeacherAvailable ? "Available" : "Unavailable"}
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

            {selectedTeacher && isValidAvailabilitySlot(selectedTeacher.startTime, selectedTeacher.endTime) ? (
              <div className="card" style={{ padding: "16px" }}>
                <strong>{selectedTeacher.name}</strong>
                <p style={{ marginTop: "8px", color: "#61728d" }}>
                  {selectedTeacherAvailable ? "Available" : "Unavailable"} | From {normalizeTimeInput(selectedTeacher.startTime)} to {normalizeTimeInput(selectedTeacher.endTime)} | {formatLabNumber(selectedTeacher.labNo)}
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
                      {teacher.subject} | {isValidAvailabilitySlot(teacher.startTime, teacher.endTime)
                        ? `From ${normalizeTimeInput(teacher.startTime)} to ${normalizeTimeInput(teacher.endTime)}`
                        : "Slot time not set"} | {formatLabNumber(teacher.labNo)}
                    </p>
                  </div>
                  <span className={isTeacherAvailableNow(teacher, currentIstTime) ? "status-pill status-pill--available" : "status-pill status-pill--busy"}>
                    {isTeacherAvailableNow(teacher, currentIstTime) ? "Available" : "Unavailable"}
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
