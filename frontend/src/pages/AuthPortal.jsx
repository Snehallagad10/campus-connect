import { useLayoutEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { session, studentApi, teacherApi } from "../api/api";
import "./AuthPortal.css";

function AuthPortal({ mode = "login", defaultRole = "student" }) {
  const navigate = useNavigate();
  useLayoutEffect(() => {
    const rootElement = document.documentElement;
    rootElement.classList.add("auth-portal-active");
    return () => rootElement.classList.remove("auth-portal-active");
  }, []);

  const [role, setRole] = useState(defaultRole);
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    subject: "",
    fullName: "",
    year: "",
    division: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isLogin = mode === "login";
  const title = isLogin ? "Welcome Back" : "Create Your Account";
  const subtitle = isLogin
    ? "Sign in to continue with appointments, feedback, and academic records."
    : "Set up secure access for slot booking, marks management, and student records.";

  const primaryLabel = useMemo(() => {
    if (isLogin) {
      return role === "student" ? "Login as Student" : "Login as Teacher";
    }

    return role === "student" ? "Register as Student" : "Register as Teacher";
  }, [isLogin, role]);

  const handleChange = (event) => {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (isLogin) {
        const apiCall = role === "student" ? studentApi.login : teacherApi.login;
        const payload = {
          email: form.email,
          password: form.password,
        };

        const { data } = await apiCall(payload);
        session.set({
          role,
          user: role === "student" ? data.student : data.teacher,
        });
        setMessage(data.message);
        navigate(role === "student" ? "/student-dashboard" : "/teacher-dashboard");
        return;
      }

      if (role === "student") {
        const { data } = await studentApi.register({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          year: form.year,
          division: form.division,
        });
        setMessage(data.message);
      } else {
        const { data } = await teacherApi.register({
          name: form.name,
          email: form.email,
          password: form.password,
          subject: form.subject,
        });
        setMessage(data.message);
      }

      setTimeout(() => navigate(role === "student" ? "/student-login" : "/teacher-login"), 900);
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-shell">
      <section className="portal-card">
        <div className="portal-card__header">
          <span className="portal-card__eyebrow">Campus Connect</span>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>

        <div className="portal-switch" role="tablist" aria-label="Select role">
          <button
            type="button"
            className={role === "student" ? "portal-switch__btn portal-switch__btn--active" : "portal-switch__btn"}
            onClick={() => setRole("student")}
          >
            Student
          </button>
          <button
            type="button"
            className={role === "teacher" ? "portal-switch__btn portal-switch__btn--active" : "portal-switch__btn"}
            onClick={() => setRole("teacher")}
          >
            Teacher
          </button>
        </div>

        <form className="portal-form" onSubmit={handleSubmit}>
          {isLogin ? null : role === "student" ? (
            <>
              <input
                name="fullName"
                placeholder="Enter Full Name"
                value={form.fullName}
                onChange={handleChange}
                required
              />
              <div className="portal-form__split">
                <input
                  name="year"
                  placeholder="Enter Year"
                  value={form.year}
                  onChange={handleChange}
                  required
                />
                <input
                  name="division"
                  placeholder="Enter Division"
                  value={form.division}
                  onChange={handleChange}
                  required
                />
              </div>
            </>
          ) : (
            <>
              <input
                name="name"
                placeholder="Enter Full Name"
                value={form.name}
                onChange={handleChange}
                required
              />
              <input
                name="subject"
                placeholder="Enter Subject"
                value={form.subject}
                onChange={handleChange}
                required
              />
            </>
          )}

          <input
            name="email"
            type="email"
            placeholder="Enter Email"
            value={form.email}
            onChange={handleChange}
            required
          />

          <input
            name="password"
            type="password"
            placeholder="Enter Password"
            value={form.password}
            onChange={handleChange}
            required
          />

          {message ? <div className="alert alert--success">{message}</div> : null}
          {error ? <div className="alert alert--error">{error}</div> : null}

          <button className="portal-form__submit" type="submit" disabled={loading}>
            {loading ? "Please wait..." : primaryLabel}
          </button>
        </form>

        <p className="portal-card__footer">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <Link to={isLogin ? "/register" : "/login"}>{isLogin ? "Register" : "Login"}</Link>
        </p>
      </section>
    </div>
  );
}

export default AuthPortal;
