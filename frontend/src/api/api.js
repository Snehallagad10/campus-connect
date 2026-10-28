import axios from "axios";

export const apiBaseURL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

const api = axios.create({ baseURL: apiBaseURL });

const STORAGE_KEY = "tsbms_session";

export const session = {
  get() {
    const rawSession = sessionStorage.getItem(STORAGE_KEY);
    return rawSession ? JSON.parse(rawSession) : null;
  },
  set(payload) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  },
  clear() {
    sessionStorage.removeItem(STORAGE_KEY);
  },
};

export const teacherApi = {
  register: (payload) => api.post("/teacher/register", payload),
  login: (payload) => api.post("/teacher/login", payload),
  getAll: () => api.get("/teacher/all"),
  updateAvailability: (teacherId, payload) =>
    api.put(`/teacher/availability/${teacherId}`, payload),
};

export const studentApi = {
  register: (payload) => api.post("/student/register", payload),
  login: (payload) => api.post("/student/login", payload),
};

export const appointmentApi = {
  book: (payload) => api.post("/appointment/book", payload),
  getAll: (params) => api.get("/appointment/all", { params }),
};

export const marksApi = {
  save: (payload) => api.post("/marks/save", payload),
  exportMarks: (teacherId, studentName = "") =>
    api.get("/marks/export/excel", {
      params: { teacherId, studentName: studentName || undefined },
      responseType: "blob",
    }),
  getByStudentName: (studentName) =>
    api.get(`/marks/${encodeURIComponent(studentName)}`),
  search: (studentName, teacherId) =>
    api.get("/marks", {
      params: { teacherId, studentName: studentName || undefined },
    }),
};

export default api;
