import { useEffect, useState, useRef } from "react";
import { appointmentApi, session, teacherApi } from "../api/api";
import {
  formatCurrentIstTime,
  formatAvailabilityNotification,
  formatLabNumber,
  isTeacherAvailableNow,
  isValidAvailabilitySlot,
  normalizeTimeInput,
} from "../utils/istTime";
import "./StudentDashboard.css";

function StudentDashboard() {
  const student = session.get()?.user;
  const studentId = student?.id || student?._id || "";
  const notificationStorageKey = `campus-connect-availability-${studentId || student?.email || "student"}`;
  const seenEventsStorageKey = `${notificationStorageKey}-seen-events`;
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
  const [availabilityNotifications, setAvailabilityNotifications] = useState(() => {
    try {
      const savedNotifications = localStorage.getItem(notificationStorageKey);
      const parsedNotifications = savedNotifications ? JSON.parse(savedNotifications) : [];
      return Array.isArray(parsedNotifications) ? parsedNotifications : [];
    } catch (_storageError) {
      return [];
    }
  });
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [toastNotification, setToastNotification] = useState(null);
  const previousAvailabilityRef = useRef(null);
  const toastTimerRef = useRef(null);
  const notificationPanelTimerRef = useRef(null);
  const seenAvailabilityEventsRef = useRef((() => {
    try {
      const savedEvents = JSON.parse(localStorage.getItem(seenEventsStorageKey) || "[]");
      return new Set(Array.isArray(savedEvents) ? savedEvents : []);
    } catch (_storageError) {
      return new Set();
    }
  })());

  useEffect(() => {
    try {
      localStorage.setItem(notificationStorageKey, JSON.stringify(availabilityNotifications));
    } catch (_storageError) {
      // Keep notifications available for this page session if storage is unavailable.
    }
  }, [availabilityNotifications, notificationStorageKey]);

  useEffect(() => () => {
    window.clearTimeout(toastTimerRef.current);
    window.clearTimeout(notificationPanelTimerRef.current);
  }, []);

  useEffect(() => {
    if (!notificationsOpen) return undefined;
    notificationPanelTimerRef.current = window.setTimeout(() => {
      setNotificationsOpen(false);
    }, 10_000);
    return () => window.clearTimeout(notificationPanelTimerRef.current);
  }, [notificationsOpen]);

  const loadData = async () => {
    try {
      const [teachersResponse, appointmentsResponse] = await Promise.all([
        teacherApi.getAll(),
        appointmentApi.getAll(studentId ? { studentId } : { studentName: student?.fullName || "" }),
      ]);
      const nextTeachers = teachersResponse.data;
      const previousAvailability = previousAvailabilityRef.current;
      const currentTime = formatCurrentIstTime();

      setAvailabilityNotifications((previous) => previous.map((notification) => {
        if (notification.message) return notification;
        const teacher = nextTeachers.find((item) =>
          notification.id?.startsWith(`${item.id || item._id}-`) || item.name === notification.teacherName
        );
        if (!teacher) return notification;
        return {
          ...notification,
          teacherId: teacher.id || teacher._id,
          teacherName: teacher.name,
          startTime: teacher.startTime,
          endTime: teacher.endTime,
          labNo: teacher.labNo,
          message: formatAvailabilityNotification(teacher),
        };
      }));

      if (previousAvailability) {
        const newlyAvailable = nextTeachers.filter((teacher) => {
          const teacherId = teacher.id || teacher._id;
          return isTeacherAvailableNow(teacher, currentTime) && previousAvailability.get(teacherId) === false;
        });

        if (newlyAvailable.length) {
          const newNotifications = newlyAvailable.flatMap((teacher) => {
            const teacherId = teacher.id || teacher._id;
            // updatedAt is changed by MongoDB whenever availability is saved, making
            // the event key stable across duplicate polls and page reloads.
            const eventId = `${teacherId}:${teacher.updatedAt || `${teacher.startTime}-${teacher.endTime}-${teacher.labNo || ""}`}`;
            if (seenAvailabilityEventsRef.current.has(eventId)) return [];
            seenAvailabilityEventsRef.current.add(eventId);
            return [{
              id: eventId,
              teacherId: teacher.id || teacher._id,
              teacherName: teacher.name,
              startTime: teacher.startTime,
              endTime: teacher.endTime,
              labNo: teacher.labNo,
              message: formatAvailabilityNotification(teacher),
              read: false,
            }];
          });
          if (newNotifications.length) {
            try {
              localStorage.setItem(seenEventsStorageKey, JSON.stringify([...seenAvailabilityEventsRef.current].slice(-500)));
            } catch (_storageError) {
              // The in-memory event set still prevents duplicates for this page session.
            }
            setAvailabilityNotifications((previous) => [...newNotifications, ...previous].slice(0, 30));
            setToastNotification(newNotifications[0]);
            window.clearTimeout(toastTimerRef.current);
            toastTimerRef.current = window.setTimeout(() => setToastNotification(null), 3000);
          }
        }
      }

      previousAvailabilityRef.current = new Map(
        nextTeachers.map((teacher) => [
          teacher.id || teacher._id,
          isTeacherAvailableNow(teacher, currentTime),
        ])
      );
      setTeachers(nextTeachers);
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
  const currentIstTime = formatCurrentIstTime();
  const selectedTeacherAvailable = isTeacherAvailableNow(selectedTeacher, currentIstTime);
  const unreadNotificationCount = availabilityNotifications.filter((notification) => !notification.read).length;

  const toggleNotifications = () => setNotificationsOpen((previous) => !previous);

  const viewNotification = (notificationId) => {
    setAvailabilityNotifications((previous) => previous.filter((notification) => notification.id !== notificationId));
  };

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
      {toastNotification ? (
        <div className="student-availability-toast" role="status" aria-live="polite">
          <span>{toastNotification.message}</span>
          <button
            type="button"
            onClick={() => {
              window.clearTimeout(toastTimerRef.current);
              setToastNotification(null);
            }}
            aria-label="Dismiss availability notification"
          >
            &times;
          </button>
        </div>
      ) : null}

      <div className="page-header">
        <div>
          <h1>Student Dashboard</h1>
          <p>Check live faculty slots, book appointments, and track request status.</p>
        </div>
        <div className="student-notifications">
          <button
            className="student-notifications__bell"
            type="button"
            onClick={toggleNotifications}
            aria-label={unreadNotificationCount ? `Notifications, ${unreadNotificationCount} unread` : "Notifications"}
            aria-expanded={notificationsOpen}
            aria-controls="student-notifications-panel"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
              <path d="M10 21h4" />
            </svg>
            {unreadNotificationCount > 0 ? (
              <span className="student-notifications__badge" aria-hidden="true">
                {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
              </span>
            ) : null}
          </button>
          {notificationsOpen ? (
            <section className="student-notifications__panel" id="student-notifications-panel" aria-label="Availability notifications">
              <h2>Notifications</h2>
              {availabilityNotifications.length ? (
                <ul>
                  {availabilityNotifications.map((notification) => (
                    <li key={notification.id}>
                      <button
                        className="student-notifications__item"
                        type="button"
                        onClick={() => viewNotification(notification.id)}
                        aria-label={`View and dismiss: ${notification.message || `${notification.teacherName} is now available for slot booking.`}`}
                      >
                        <span className="student-notifications__dot" aria-hidden="true" />
                        <span>{notification.message || `${notification.teacherName} is now available for slot booking.`}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="student-notifications__empty">No availability notifications yet.</p>
              )}
            </section>
          ) : null}
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
