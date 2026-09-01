import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { appointmentApi, session, teacherApi } from "../api/api";
import { formatCurrentIstTime, normalizeTimeInput } from "../utils/istTime";

function TeacherDashboard() {
  const navigate = useNavigate();
  const currentSession = session.get();
  const teacher = currentSession?.user;
  const teacherId = teacher?.id || teacher?._id || "";
  const [availabilityForm, setAvailabilityForm] = useState({
    isAvailable: teacher?.isAvailable || false,
    startTime: teacher?.startTime || "",
    endTime: teacher?.endTime || "",
    labNo: teacher?.labNo || "",
  });
  const [appointments, setAppointments] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [indianTime, setIndianTime] = useState("");

  const loadAppointments = async () => {
    try {
      const query = teacherId ? { teacherId } : { teacherName: teacher?.name || "" };
      const { data } = await appointmentApi.getAll(query);
      setAppointments(data);
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Unable to fetch appointments.");
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  useEffect(() => {
    setIndianTime(formatCurrentIstTime());

    const timer = setInterval(() => {
      setIndianTime(formatCurrentIstTime());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const pendingAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.status === "Pending"),
    [appointments]
  );

  const handleAvailabilityChange = async (event) => {
    const { name, value, type, checked } = event.target;
    const newValue = type === "checkbox" ? checked : value;
    
    setAvailabilityForm((previous) => ({
      ...previous,
      [name]: newValue,
    }));

    if (type === "checkbox") {
      setSaving(true);
      setMessage("");
      setError("");
      try {
        const { data } = await teacherApi.updateAvailability(teacherId || "lookup", {
          ...availabilityForm,
          [name]: newValue,
          startTime: normalizeTimeInput(availabilityForm.startTime),
          endTime: normalizeTimeInput(availabilityForm.endTime),
          email: teacher?.email || "",
        });
        session.set({ role: "teacher", user: data.teacher });
        setAvailabilityForm({
          isAvailable: data.teacher.isAvailable,
          startTime: normalizeTimeInput(data.teacher.startTime),
          endTime: normalizeTimeInput(data.teacher.endTime),
          labNo: data.teacher.labNo,
        });
        setMessage("Availability status updated live.");
      } catch (apiError) {
        setError(apiError.response?.data?.message || "Unable to save availability.");
      } finally {
        setSaving(false);
      }
    }
  };

  const saveAvailability = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const { data } = await teacherApi.updateAvailability(teacherId || "lookup", {
        ...availabilityForm,
        startTime: normalizeTimeInput(availabilityForm.startTime),
        endTime: normalizeTimeInput(availabilityForm.endTime),
        email: teacher?.email || "",
      });
      session.set({ role: "teacher", user: data.teacher });
      setAvailabilityForm({
        isAvailable: data.teacher.isAvailable,
        startTime: normalizeTimeInput(data.teacher.startTime),
        endTime: normalizeTimeInput(data.teacher.endTime),
        labNo: data.teacher.labNo,
      });
      setMessage(data.message);
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Unable to save availability.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-grid teacher-dashboard-page">
      <div className="page-header">
        <div>
          <h1>Teacher Dashboard</h1>
          <p>Manage live slot booking, pending student requests, and marks workflow.</p>
        </div>
      </div>

      <div className="dashboard-grid teacher-dashboard-grid">
        <section className="card card--span-12 teacher-dashboard-card teacher-dashboard-card--availability">
          <div className="page-header">
            <div>
              <h3>Set Live Availability</h3>
              <p>Current Indian Time (IST): {indianTime}</p>
            </div>
          </div>
          <form className="page-grid teacher-dashboard-form" onSubmit={saveAvailability}>
            <label className="availability-toggle">
              <div>
                <strong>Teacher available for booking</strong>
                <p>
                  {availabilityForm.isAvailable
                    ? "Students can see and book your current slot."
                    : "Students cannot book until availability is enabled."}
                </p>
              </div>
              <span className="toggle-switch">
                <input
                  type="checkbox"
                  name="isAvailable"
                  checked={availabilityForm.isAvailable}
                  onChange={handleAvailabilityChange}
                />
                <span className="toggle-slider" />
              </span>
            </label>

            {availabilityForm.isAvailable && (
              <div className="input-grid">
                <div className="form-group">
                  <label htmlFor="teacher-start">From Time</label>
                  <input
                    id="teacher-start"
                    type="time"
                    name="startTime"
                    value={availabilityForm.startTime}
                    onChange={handleAvailabilityChange}
                    required={availabilityForm.isAvailable}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="teacher-end">To Time</label>
                  <input
                    id="teacher-end"
                    type="time"
                    name="endTime"
                    value={availabilityForm.endTime}
                    onChange={handleAvailabilityChange}
                    required={availabilityForm.isAvailable}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="teacher-lab">Lab Number</label>
                  <input
                    id="teacher-lab"
                    name="labNo"
                    value={availabilityForm.labNo}
                    onChange={handleAvailabilityChange}
                    placeholder="Lab 204"
                  />
                </div>
              </div>
            )}

            {message ? <div className="alert alert--success">{message}</div> : null}
            {error ? <div className="alert alert--error">{error}</div> : null}

            <button type="submit" className="button" disabled={saving}>
              {saving ? "Saving..." : "Save Availability"}
            </button>
          </form>
        </section>

        <section className="card card--span-6 teacher-dashboard-card teacher-dashboard-card--stats">
          <h3>Appointment Status Overview</h3>
          <div className="stats-grid">
            <div className="stat">
              <span>Total Requests</span>
              <strong>{appointments.length}</strong>
            </div>
            <div className="stat">
              <span>Pending Requests</span>
              <strong>{pendingAppointments.length}</strong>
            </div>
            <div className="stat">
              <span>Completed Reviews</span>
              <strong>{appointments.length - pendingAppointments.length}</strong>
            </div>
          </div>
        </section>

        <section className="card card--span-6 teacher-dashboard-card teacher-dashboard-card--requests">
          <div className="page-header">
            <div>
              <h3>Pending Student Requests</h3>
              <p>Open any appointment to assign marks and feedback.</p>
            </div>
            <button type="button" className="button-secondary" onClick={loadAppointments}>
              Refresh
            </button>
          </div>

          <div className="list-card">
            {pendingAppointments.length ? (
              pendingAppointments.map((appointment) => (
                <article key={appointment._id} className="list-item">
                  <div>
                    <h4>{appointment.studentName}</h4>
                    <p>
                      {appointment.classDiv} | {appointment.reason} | {appointment.date}
                    </p>
                    {appointment.remarks ? (
                      <p>
                        Remark: {appointment.remarks}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="button"
                    onClick={() =>
                      navigate("/marks-feedback", {
                        state: { appointment },
                      })
                    }
                  >
                    Open Marks Page
                  </button>
                </article>
              ))
            ) : (
              <div className="empty-state">No pending appointments for this teacher right now.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default TeacherDashboard;
