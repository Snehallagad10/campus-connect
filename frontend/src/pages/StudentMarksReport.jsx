import { useEffect, useState } from "react";
import { marksApi, session } from "../api/api";
import "./StudentMarksReport.css";

function StudentMarksReport() {
  const currentSession = session.get();
  const [search, setSearch] = useState(currentSession.role === "student" ? currentSession.user.fullName : "");
  const [records, setRecords] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [exporting, setExporting] = useState(false);

  const loadMarks = async (studentName = "") => {
    setError("");
    setMessage("");

    try {
      const response =
        currentSession.role === "student"
          ? await marksApi.getByStudentName(currentSession.user.fullName)
          : await marksApi.search(studentName);

      const data = response.data;
      setRecords(data);
      if (!data.length) {
        setMessage("No marks records found for the current search.");
      }
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Unable to load marks report.");
    }
  };

  const exportMarks = async () => {
    setError("");
    setMessage("");
    setExporting(true);

    try {
      const response = await marksApi.exportMarks();
      const contentType = response.headers["content-type"] || "";

      if (!contentType.includes("spreadsheetml.sheet")) {
        throw new Error("The server did not return a valid Excel file.");
      }

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = "Marks_Report.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      setMessage("Marks report exported successfully.");
    } catch (apiError) {
      setError(apiError.response?.data?.message || apiError.message || "Unable to export marks report.");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    loadMarks(search);
  }, []);

  return (
    <div className="report-page">
      <div className="report-card">
        <div className="page-header">
          <div>
            <h2>Marks Report</h2>
            <p>Professional ERP table view for assignment, practical, and mini project marks.</p>
          </div>
          {currentSession.role === "teacher" ? (
            <button className="button" type="button" onClick={exportMarks} disabled={exporting}>
              {exporting ? "Exporting..." : "Export to Excel"}
            </button>
          ) : null}
        </div>

        {currentSession.role === "teacher" ? (
          <div className="search-bar">
            <input className="report-search" placeholder="Search student by name" value={search} onChange={(event) => setSearch(event.target.value)} />
            <button className="button" type="button" onClick={() => loadMarks(search)}>
              Search Student
            </button>
          </div>
        ) : null}

        {message ? <div className="alert alert--success">{message}</div> : null}
        {error ? <div className="alert alert--error">{error}</div> : null}

        <div className="table-wrap">
          <table className="erp-table report-table">
            <thead>
              <tr>
                {currentSession.role === "teacher" ? <th>Student Name</th> : null}
                <th>Reason</th>
                <th>Remark</th>
                <th>Grade</th>
                <th>Feedback</th>
                <th>Checked Date</th>
              </tr>
            </thead>
            <tbody>
              {records.length ? (
                records.map((record) => (
                  <tr key={record._id}>
                    {currentSession.role === "teacher" ? <td>{record.studentName}</td> : null}
                    <td>{record.reason}</td>
                    <td>{record.remarks || "-"}</td>
                    <td>{record.grade || "-"}</td>
                    <td>{record.feedback || "-"}</td>
                    <td>{new Date(record.checkedDate).toLocaleDateString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={currentSession.role === "teacher" ? 6 : 5}>
                    <div className="empty-state">No marks available yet.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default StudentMarksReport;
