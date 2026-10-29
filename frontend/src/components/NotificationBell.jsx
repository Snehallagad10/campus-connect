import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { appointmentApi, notificationApi } from "../api/api";
import "./NotificationBell.css";

export default function NotificationBell({ userId, role, onAvailability }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const { data } = await notificationApi.getAll(userId, role);
      setItems(data);
      setError("");
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Unable to load notifications.");
    }
  }, [role, userId]);

  useEffect(() => {
    const initialLoad = window.setTimeout(refresh, 0);
    const timer = window.setInterval(refresh, 10000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [refresh]);

  const openNotification = async (item) => {
    if (!item.read) {
      try {
        await notificationApi.markRead(item.id || item._id, userId, role);
        setItems((previous) => previous.map((entry) =>
          (entry.id || entry._id) === (item.id || item._id) ? { ...entry, read: true } : entry
        ));
      } catch (apiError) {
        setError(apiError.response?.data?.message || "Unable to mark notification as read.");
      }
    }
    setOpen(false);
    if (item.type === "availability" && item.teacherId) onAvailability?.(String(item.teacherId));
    else if (role === "teacher" && item.type === "appointment" && item.relatedId) {
      try {
        const { data } = await appointmentApi.getAll({ teacherId: userId, includeAll: true });
        const appointment = data.find((entry) => String(entry._id) === String(item.relatedId));
        if (appointment) {
          navigate("/marks-feedback", { state: { appointment } });
          return;
        }
      } catch (apiError) {
        setError(apiError.response?.data?.message || "Unable to open appointment request.");
      }
      navigate("/teacher-dashboard");
    }
    else if (role === "teacher") navigate("/teacher-dashboard");
    else navigate("/student-history");
  };

  const unread = items.filter((item) => !item.read).length;
  return (
    <div className="app-notifications">
      <button className="app-notifications__bell" type="button" onClick={() => setOpen((value) => !value)}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} aria-expanded={open}>
        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" />
        </svg>
        {unread > 0 ? <span className="app-notifications__badge">{unread > 9 ? "9+" : unread}</span> : null}
      </button>
      {open ? <section className="app-notifications__panel" aria-label="Notifications">
        <h2>Notifications</h2>
        {error ? <p role="alert">{error}</p> : null}
        {items.length ? <ul>{items.map((item) => <li key={item.id || item._id}>
          <button className={`app-notifications__item${item.read ? " is-read" : ""}`} type="button" onClick={() => openNotification(item)}>
            <span>{item.message}</span><small>{new Date(item.createdAt).toLocaleString()}</small>
          </button>
        </li>)}</ul> : <p className="app-notifications__empty">No notifications yet.</p>}
      </section> : null}
    </div>
  );
}
