const ExcelJS = require("exceljs");

const REPORT_FILE_NAME = "Marks_Report.xlsx";
const TYPE_ORDER = ["Assignment", "Practical", "Mini Project"];

function normalizeText(value) {
  return String(value || "")
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRemarkColumn(remarks, reason = "") {
  try {
    const cleanRemark = normalizeText(remarks);
    const regex = /(assignment|practical|mini\s*project)[^\d]*(\d+)/i;

    if (!cleanRemark) {
      return null;
    }

    const match = cleanRemark.match(regex);

    if (!match) {
      return {
        label: "General",
        number: Number.MAX_SAFE_INTEGER,
        type: "General",
      };
    }

    const type = match[1].toLowerCase().replace(/\s+/g, " ");
    const number = Number(match[2]);

    if (!Number.isFinite(number)) {
      return null;
    }

    const formattedType =
      type === "mini project"
        ? "Mini Project"
        : type.charAt(0).toUpperCase() + type.slice(1);

    return {
      label: `${formattedType} ${number}`,
      number,
      type: formattedType,
    };
  } catch (_error) {
    return null;
  }
}

function getDisplayGrade(record) {
  const grade = String(record.grade || "").trim();
  return grade || "-";
}

function sortColumns(columns) {
  return [...columns].sort((left, right) => {
    if (left.type === "General") {
      return 1;
    }

    if (right.type === "General") {
      return -1;
    }

    const typeDifference =
      TYPE_ORDER.indexOf(left.type) - TYPE_ORDER.indexOf(right.type);

    if (typeDifference !== 0) {
      return typeDifference;
    }

    return left.number - right.number;
  });
}

function buildMarksPivot(records) {
  const columnsByLabel = new Map();
  const studentsByKey = new Map();
  const skippedRemarks = [];

  records.forEach((record) => {
    const remarks =
      record.remarks ??
      record.remark ??
      record.assignment ??
      record.assignmentName ??
      record.assignmentTitle ??
      "";
    const remarkText = String(remarks || "").trim();
    const studentName = String(record.studentName || "").trim();
    const studentKey = studentName.toLowerCase();

    if (!remarkText) {
      skippedRemarks.push({
        studentName: record.studentName || "",
        remarks,
      });
      return;
    }

    if (!studentKey) {
      skippedRemarks.push({
        studentName: record.studentName || "",
        remarks,
      });
      return;
    }

    const parsedColumn = parseRemarkColumn(remarks, record.reason);

    if (!parsedColumn) {
      skippedRemarks.push({
        studentName: record.studentName || "",
        remarks,
      });
      return;
    }

    columnsByLabel.set(parsedColumn.label, parsedColumn);

    if (!studentsByKey.has(studentKey)) {
      studentsByKey.set(studentKey, {
        name: studentName,
        grades: {},
      });
    }

    const student = studentsByKey.get(studentKey);
    const grade = getDisplayGrade(record);
    const existingGrade = student.grades[parsedColumn.label];

    if (!existingGrade || existingGrade === "-") {
      student.grades[parsedColumn.label] = grade;
    } else if (grade !== "-" && !existingGrade.split(", ").includes(grade)) {
      student.grades[parsedColumn.label] = `${existingGrade}, ${grade}`;
    }
  });

  const columns = sortColumns([...columnsByLabel.values()]);
  const students = [...studentsByKey.values()].sort((left, right) =>
    left.name.localeCompare(right.name)
  );

  const rows = students.map((student) => {
    const row = {
      Name: student.name,
    };

    columns.forEach((column) => {
      row[column.label] = student.grades[column.label] || "-";
    });

    return row;
  });

  return {
    columns: columns.map((column) => column.label),
    rows,
    skippedRemarks,
  };
}

function applyWorksheetFormatting(worksheet) {
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF17345D" },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  worksheet.eachRow((row, rowNumber) => {
    row.height = rowNumber === 1 ? 24 : 22;

    row.eachCell((cell, columnNumber) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFD9E3F2" } },
        left: { style: "thin", color: { argb: "FFD9E3F2" } },
        bottom: { style: "thin", color: { argb: "FFD9E3F2" } },
        right: { style: "thin", color: { argb: "FFD9E3F2" } },
      };
      cell.alignment = {
        horizontal: columnNumber === 1 ? "left" : "center",
        vertical: "middle",
      };

      if (rowNumber > 1 && rowNumber % 2 === 0) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FBFF" },
        };
      }
    });
  });

  worksheet.columns.forEach((column) => {
    let maxLength = 12;

    column.eachCell({ includeEmpty: true }, (cell) => {
      const value = cell.value ? String(cell.value) : "";
      maxLength = Math.max(maxLength, value.length + 2);
    });

    column.width = Math.min(Math.max(maxLength, 14), 28);
  });

  if (worksheet.rowCount > 1 && worksheet.columnCount > 0) {
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: worksheet.rowCount, column: worksheet.columnCount },
    };
  }
}

async function createMarksReportWorkbook(records) {
  const { columns, rows, skippedRemarks } = buildMarksPivot(records);
  const workbook = new ExcelJS.Workbook();
  const detailWorksheet = workbook.addWorksheet("Report Details");
  detailWorksheet.columns = [
    { header: "Teacher", key: "teacherName" },
    { header: "Subject", key: "subject" },
    { header: "Student Name", key: "studentName" },
    { header: "Class / Division", key: "classDiv" },
    { header: "Assessment", key: "reason" },
    { header: "Remark", key: "remarks" },
    { header: "Grade", key: "grade" },
    { header: "Feedback", key: "feedback" },
    { header: "Checked Date", key: "checkedDate" },
    { header: "Appointment ID", key: "appointmentId" },
  ];
  detailWorksheet.addRows(records.map((record) => ({
    teacherName: record.teacherName || "",
    subject: record.subject || "",
    studentName: record.studentName || "",
    classDiv: record.classDiv || "",
    reason: record.reason || "",
    remarks: record.remarks || "",
    grade: getDisplayGrade(record),
    feedback: record.feedback || "",
    checkedDate: record.checkedDate ? new Date(record.checkedDate) : "",
    appointmentId: record.appointmentId ? String(record.appointmentId) : "",
  })));
  detailWorksheet.getColumn("checkedDate").numFmt = "yyyy-mm-dd hh:mm";
  applyWorksheetFormatting(detailWorksheet);

  const summaryWorksheet = workbook.addWorksheet("Marks Summary");

  summaryWorksheet.columns = ["Name", ...columns].map((header) => ({
    header,
    key: header,
  }));

  if (columns.length && rows.length) {
    summaryWorksheet.addRows(rows);
  }

  applyWorksheetFormatting(summaryWorksheet);

  const buffer = await workbook.xlsx.writeBuffer();

  return {
    buffer,
    columns,
    fileName: REPORT_FILE_NAME,
    skippedRemarks,
  };
}

module.exports = {
  buildMarksPivot,
  createMarksReportWorkbook,
  parseRemarkColumn,
};
