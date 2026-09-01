import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { marksApi } from "../api/api";
import "./MarksFeedback.css";

function MarksFeedback() {
  const navigate = useNavigate();
  const location = useLocation();
  const appointment = location.state?.appointment;
  const [form, setForm] = useState({
    grade: "",
    feedback: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!appointment) {
    return (
      <div className="marks-page">
        <div className="marks-card">
          <h2>No Appointment Selected</h2>
          <p>Please open this page from the teacher dashboard pending requests list.</p>
          <button className="button" type="button" onClick={() => navigate("/teacher-dashboard")}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleChange = (event) => {
    setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const { data } = await marksApi.save({
        appointmentId: appointment._id,
        studentName: appointment.studentName,
        classDiv: appointment.classDiv,
        reason: appointment.reason,
        remarks: appointment.remarks || "",
        ...form,
      });
      setMessage(data.message || `Marks saved successfully for ${data.studentName}.`);
      setTimeout(() => navigate("/teacher-dashboard"), 900);
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Unable to save marks.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="marks-page">
      <div className="marks-card">
        <div className="page-header">
          <div>
            <h2>Assignment / Practical Marks Page</h2>
            <p>Review the selected appointment and submit marks with feedback.</p>
          </div>
        </div>

        <div className="marks-summary">
          <div>
            <span>Student Name</span>
            <strong>{appointment.studentName}</strong>
          </div>
          <div>
            <span>Class / Div</span>
            <strong>{appointment.classDiv}</strong>
          </div>
          <div>
            <span>Reason</span>
            <strong>{appointment.reason}</strong>
          </div>
          <div>
            <span>Remark</span>
            <strong>{appointment.remarks || "--"}</strong>
          </div>
          <div>
            <span>Booked Date</span>
            <strong>{appointment.date}</strong>
          </div>
        </div>

        <form className="page-grid" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="grade">Grade</label>
            <input
              id="grade"
              name="grade"
              value={form.grade}
              onChange={handleChange}
              placeholder="Example: A, B+, 8/10"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="feedback">Feedback</label>
            <textarea
              id="feedback"
              name="feedback"
              value={form.feedback}
              onChange={handleChange}
              placeholder="Optional feedback"
            />
          </div>

          {message ? <div className="alert alert--success">{message}</div> : null}
          {error ? <div className="alert alert--error">{error}</div> : null}

          <div className="toolbar">
            <button className="button" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Marks"}
            </button>
            <button className="button-secondary" type="button" onClick={() => navigate("/teacher-dashboard")}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MarksFeedback;
