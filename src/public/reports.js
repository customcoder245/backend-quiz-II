const token = localStorage.getItem("adminToken");

if (!token) {
  window.location.replace("/login");
}

const reportsMessage = document.getElementById("reportsMessage");
const reportSummary = document.getElementById("reportSummary");
const reportCards = document.getElementById("reportCards");
const backButton = document.getElementById("backButton");
const saveJsonButton = document.getElementById("saveJsonButton");
const savePdfButton = document.getElementById("savePdfButton");
const REPORTS_ENDPOINT = "/api/v1/admin/reports";

let latestReportPayload = null;

const setReportsMessage = (message, type = "") => {
  reportsMessage.textContent = message;
  reportsMessage.className = `message${type ? ` ${type}` : ""}`;
};

const requestHeaders = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json"
};

const fetchJson = async (endpoint, options = {}) => {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      ...requestHeaders,
      ...(options.headers || {})
    }
  });

  let data = {};
  try {
    data = await response.json();
  } catch (error) {
    data = {};
  }

  if (!response.ok) {
    const requestError = new Error(data.message || `Request failed with status ${response.status}`);
    requestError.status = response.status;
    requestError.data = data;
    throw requestError;
  }

  return data;
};

const handleAuthFailure = () => {
  localStorage.removeItem("adminToken");
  localStorage.removeItem("adminUser");
  document.cookie = "adminToken=; path=/; max-age=0; samesite=lax";
  window.location.replace("/login");
};

const formatDateTime = (value) => value || "Not available";

const renderSummary = (stats = {}, submissions = []) => {
  const items = [
    { label: "Total Users", value: stats.totalUsers ?? submissions.length ?? 0 },
    { label: "Total Submissions", value: stats.totalSubmissions ?? submissions.length ?? 0 },
    { label: "Completed", value: stats.completedSubmissions ?? 0 },
    { label: "Completion Rate", value: stats.completionRate ?? "0%" }
  ];

  reportSummary.innerHTML = items
    .map(
      (item) => `
        <article class="card stat-card">
          <div class="stat-label">${item.label}</div>
          <div class="stat-value">${item.value}</div>
        </article>
      `
    )
    .join("");
};

const renderReports = (submissions = []) => {
  if (!submissions.length) {
    reportCards.innerHTML = `<div class="empty-state">No user data has been found for the report yet.</div>`;
    return;
  }

  reportCards.innerHTML = submissions
    .map(
      (submission) => `
        <article class="report-card">
          <div class="report-card-header">
            <div>
              <h3>${submission.fullName || "Guest"}</h3>
              <p>${submission.email || "N/A"}</p>
            </div>
            <span class="status-pill ${submission.status === "Published" ? "submitted" : "pending"}">
              ${submission.status || "Draft"}
            </span>
          </div>

          <div class="report-meta">
            <div><strong>Submission ID:</strong> ${submission.submissionId || "N/A"}</div>
            <div><strong>Gender:</strong> ${submission.gender || "N/A"}</div>
            <div><strong>Responses:</strong> ${submission.responseCount ?? 0}</div>
            <div><strong>Created:</strong> ${formatDateTime(submission.createdAt)}</div>
          </div>

          <div class="answers-list">
            ${(submission.fullResponses || [])
              .map(
                (answer) => `
                  <div class="answer-card">
                    <span class="answer-key">${answer.key || "QUESTION"}</span>
                    <strong>${answer.question || "Question"}</strong>
                    <p>${answer.answer || "N/A"}</p>
                  </div>
                `
              )
              .join("")}
          </div>
        </article>
      `
    )
    .join("");
};

const loadReports = async () => {
  setReportsMessage("Reports are loading...");

  try {
    const data = await fetchJson(REPORTS_ENDPOINT);
    latestReportPayload = data;

    const stats = data?.stats || {};
    const submissions = data?.submissions || [];

    renderSummary(stats, submissions);
    renderReports(submissions);
    setReportsMessage(`${submissions.length} users have been loaded into the report.`, "success");
  } catch (error) {
    const status = error?.status || error?.response?.status;

    if (status === 401 || status === 403) {
      handleAuthFailure();
      return;
    }

    setReportsMessage(
      error?.data?.message || error?.response?.data?.message || error.message || "The reports could not be loaded.",
      "error"
    );
  }
};

const savePdf = () => {
  if (!latestReportPayload?.submissions?.length) {
    setReportsMessage("Report data is required to generate the PDF.", "error");
    return;
  }

  if (typeof window.jspdf?.jsPDF !== "function") {
    setReportsMessage("The PDF library is not available. Please check your internet connection and reload the page.", "error");
    return;
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  if (typeof pdf.autoTable !== "function") {
    setReportsMessage("The PDF table plugin is not available. Please reload the page and try again.", "error");
    return;
  }

  const rows = latestReportPayload.submissions.map((submission) => [
    submission.submissionId || "N/A",
    submission.fullName || "Guest",
    submission.email || "N/A",
    submission.gender || "N/A",
    String(submission.responseCount ?? 0),
    submission.status || "Draft",
    submission.createdAt || "N/A"
  ]);

  pdf.setFontSize(18);
  pdf.text("Assessment Report", 40, 40);
  pdf.setFontSize(10);
  pdf.text(`Generated: ${new Date().toLocaleString()}`, 40, 60);

  pdf.autoTable({
    startY: 80,
    head: [["ID", "Name", "Email", "Gender", "Responses", "Status", "Created"]],
    body: rows,
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [194, 98, 45] }
  });

  let currentY = pdf.lastAutoTable.finalY + 24;

  latestReportPayload.submissions.forEach((submission, index) => {
    if (currentY > 700) {
      pdf.addPage();
      currentY = 40;
    }

    pdf.setFontSize(12);
    pdf.text(`${index + 1}. ${submission.fullName || "Guest"} - ${submission.email || "N/A"}`, 40, currentY);
    currentY += 16;

    (submission.fullResponses || []).slice(0, 12).forEach((answer) => {
      if (currentY > 760) {
        pdf.addPage();
        currentY = 40;
      }

      pdf.setFontSize(9);
      pdf.text(`${answer.key || "QUESTION"}: ${answer.answer || "N/A"}`, 50, currentY, { maxWidth: 500 });
      currentY += 14;
    });

    currentY += 10;
  });

  const fileName = `assessment-report-${new Date().toISOString().slice(0, 10)}.pdf`;
  pdf.save(fileName);
  setReportsMessage(`The PDF has been saved.: ${fileName}`, "success");
};

const saveJson = () => {
  if (!latestReportPayload) {
    setReportsMessage("Report data is required to generate the JSON.", "error");
    return;
  }

  const blob = new Blob([JSON.stringify(latestReportPayload, null, 2)], {
    type: "application/json"
  });
  const fileName = `assessment-report-${new Date().toISOString().slice(0, 10)}.json`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setReportsMessage(`JSON save ho gayi: ${fileName}`, "success");
};

backButton?.addEventListener("click", () => {
  window.location.href = "/dashboard";
});

savePdfButton?.addEventListener("click", savePdf);
saveJsonButton?.addEventListener("click", saveJson);

loadReports();
