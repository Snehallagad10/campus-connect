import { useEffect, useState } from "react";
import { marksApi, session } from "../api/api";
import "./StudentMarksReport.css";

function StudentMarksReport() {
  const currentSession = session.get();
  const teacherId = currentSession.role === "teacher"
    ? currentSession.user.id || currentSession.user._id
    : "";
  const [search, setSearch] = useState(currentSession.role === "student" ? currentSession.user.fullName : "");
  const [activeSearch, setActiveSearch] = useState("");
  const [records, setRecords] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [exporting, setExporting] = useState(false);

  const loadMarks = async (studentName = "") => {
    setError("");
    setMessage("");
    setRecords([]);
    setActiveSearch(studentName);

    try {
      const response =
        currentSession.role === "student"
          ? await marksApi.getByStudentName(currentSession.user.fullName)
          : await marksApi.search(studentName, teacherId);

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

    if (!records.length) {
      setMessage("There are no marks records to export for this report.");
      return;
    }

    setExporting(true);

    try {
      const response = await marksApi.exportMarks(teacherId, activeSearch);
      const contentType = response.headers["content-type"] || "";
      const blob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data], { type: contentType });
      const xlsxSignature = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
      const isXlsxZip = xlsxSignature.length === 4 &&
        xlsxSignature[0] === 0x50 && xlsxSignature[1] === 0x4b &&
        xlsxSignature[2] === 0x03 && xlsxSignature[3] === 0x04;

      if (!contentType.includes("spreadsheetml.sheet") || !blob.size || !isXlsxZip) {
        let failureMessage = "The server did not return a valid Excel file.";
        try {
          const errorBody = JSON.parse(await blob.text());
          failureMessage = errorBody.message || failureMessage;
        } catch (_parseError) {
          // Keep the readable fallback for non-JSON server responses.
        }
        throw new Error(failureMessage);
      }

      const fileName = "Marks_Report.xlsx";
      const nativeDownload = window.CampusConnectDownloads;
      if (nativeDownload?.saveBase64File) {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error("Could not read the Excel report for saving."));
          reader.readAsDataURL(blob);
        });
        const base64 = String(dataUrl).split(",", 2)[1];
        if (!base64) throw new Error("Could not prepare the Excel report for saving.");
        const saved = nativeDownload.saveBase64File(base64, fileName, contentType);
        if (!saved) throw new Error("Android could not save the Excel report. Check available storage and try again.");
        setMessage("Marks_Report.xlsx saved to your Downloads folder.");
      } else {
        const file = new File([blob], fileName, { type: contentType });
        if (navigator.canShare?.({ files: [file] }) && navigator.share) {
          await navigator.share({ files: [file], title: "Marks Report" });
          setMessage("Choose Files or Downloads in the share sheet to save Marks_Report.xlsx.");
        } else {
          const downloadUrl = window.URL.createObjectURL(file);
          const link = document.createElement("a");
          link.href = downloadUrl;
          link.download = file.name;
          link.style.display = "none";
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 60_000);
          setMessage("Download requested. If it does not appear, open this page in your browser or save the file from the share sheet.");
        }
      }
    } catch (apiError) {
      if (apiError.name === "AbortError") {
        setMessage("Save or sharing was cancelled.");
      } else {
        let failureMessage = apiError.response?.data?.message || apiError.message || "Unable to export marks report.";
        if (apiError.response?.data instanceof Blob) {
          try {
            const errorBody = JSON.parse(await apiError.response.data.text());
            failureMessage = errorBody.message || failureMessage;
          } catch (_parseError) {
            // Keep the Axios error message if the server response is not JSON.
          }
        }
        setError(failureMessage);
      }
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

        <div className="marks-mobile-list">
          {records.length ? records.map((record) => (
            <article className="marks-mobile-card" key={`mobile-${record._id}`}>
              {currentSession.role === "teacher" && <div><span>Student</span><strong>{record.studentName || "--"}</strong></div>}
              <div><span>Reason</span><strong>{record.reason || "--"}</strong></div>
              <div><span>Remark</span><strong>{record.remarks || "--"}</strong></div>
              <div><span>Grade</span><strong>{record.grade || "--"}</strong></div>
              <div><span>Feedback</span><strong>{record.feedback || "--"}</strong></div>
              <div><span>Checked date</span><strong>{new Date(record.checkedDate).toLocaleDateString()}</strong></div>
            </article>
          )) : <div className="empty-state">No marks available yet.</div>}
        </div>
        <div className="table-wrap marks-desktop-table">
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
