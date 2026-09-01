import React, { useState } from "react";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";
import { formatCurrentIstTime } from "./utils/istTime";

export default function AssignmentMarks() {
  const location = useLocation();
  const navigate = useNavigate();

  const student = location.state;

  const [marks, setMarks] = useState("");
  const [grade, setGrade] = useState("");
  const [remarks, setRemarks] =
    useState("");

  const saveMarks = () => {
    const allMarks =
      JSON.parse(
        localStorage.getItem("studentMarks")
      ) || [];

    allMarks.push({
      studentName: student.studentName,
      classDiv: student.classDiv,
      reason: student.reason,
      marks,
      grade,
      remarks,
      checkedAt: formatCurrentIstTime(),
    });

    localStorage.setItem(
      "studentMarks",
      JSON.stringify(allMarks)
    );

    alert("Marks saved successfully");

    navigate("/teacher-dashboard");
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2>Student Assignment Check</h2>

        <p>
          <b>Name:</b>{" "}
          {student.studentName}
        </p>

        <p>
          <b>Class:</b>{" "}
          {student.classDiv}
        </p>

        <p>
          <b>Reason:</b>{" "}
          {student.reason}
        </p>

        <p>
          <b>Date:</b> {student.date}
        </p>

        <input
          style={styles.input}
          placeholder="Enter Marks"
          value={marks}
          onChange={(e) =>
            setMarks(e.target.value)
          }
        />

        <input
          style={styles.input}
          placeholder="Enter Grade"
          value={grade}
          onChange={(e) =>
            setGrade(e.target.value)
          }
        />

        <textarea
          style={styles.input}
          placeholder="Remarks"
          value={remarks}
          onChange={(e) =>
            setRemarks(e.target.value)
          }
        />

        <button
          style={styles.button}
          onClick={saveMarks}
        >
          Save Marks
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f6fa",
    padding: "30px",
  },

  card: {
    background: "white",
    borderRadius: "16px",
    padding: "30px",
    maxWidth: "700px",
    margin: "auto",
    boxShadow:
      "0 4px 12px rgba(0,0,0,0.08)",
  },

  input: {
    width: "100%",
    padding: "12px",
    marginTop: "15px",
    border: "1px solid #ddd",
    borderRadius: "10px",
  },

  button: {
    marginTop: "20px",
    width: "100%",
    padding: "12px",
    background: "#1f2a44",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
  },
};
