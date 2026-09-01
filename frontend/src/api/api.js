import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:2000",
});

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
  exportMarks: () =>
    api.get("/marks/export/excel", {
      responseType: "blob",
    }),
  getByStudentName: (studentName) =>
    api.get(`/marks/${encodeURIComponent(studentName)}`),
  search: (studentName) =>
    api.get("/marks", {
      params: studentName ? { studentName } : {},
    }),
};

export default api;
