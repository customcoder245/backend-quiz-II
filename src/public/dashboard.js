const token = localStorage.getItem("adminToken");

if (!token) {
  window.location.replace("/login");
}

const dashboardMessage = document.getElementById("dashboardMessage");
const usersMessage = document.getElementById("usersMessage");
const statsGrid = document.getElementById("statsGrid");
const userCards = document.getElementById("userCards");
const submissionTableBody = document.getElementById("submissionTableBody");
const reportsButton = document.getElementById("reportsButton");
const refreshButton = document.getElementById("refreshButton");
const logoutButton = document.getElementById("logoutButton");
const API_ENDPOINT = "/api/v1/admin/dashboard";
const USERS_ENDPOINT = "/api/v1/admin/user-details";
const USER_RESPONSES_ENDPOINT = "/api/v1/admin/user-responses";

const setDashboardMessage = (message, type = "") => {
  dashboardMessage.textContent = message;
  dashboardMessage.className = `message${type ? ` ${type}` : ""}`;
};

const setUsersMessage = (message, type = "") => {
  usersMessage.textContent = message;
  usersMessage.className = `message${type ? ` ${type}` : ""}`;
};

const escapeHTML = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getSubmissionValue = (submission, key, fallback = "N/A") => {
  if (submission?.[key] !== undefined && submission?.[key] !== null && submission?.[key] !== "") {
    return submission[key];
  }

  if (
    submission?.user?.[key] !== undefined &&
    submission?.user?.[key] !== null &&
    submission?.user?.[key] !== ""
  ) {
    return submission.user[key];
  }

  return fallback;
};

const formatStatCards = (stats) => {
  const items = [
    { label: "Total Submissions", value: stats.totalSubmissions ?? 0 },
    { label: "Completed", value: stats.completedSubmissions ?? 0 },
    { label: "Total Users", value: stats.totalUsers ?? 0 },
    { label: "Completion Rate", value: stats.completionRate ?? "0%" }
  ];

  statsGrid.innerHTML = items
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

const formatDateTime = (value) => {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
};

const formatFieldLabel = (key) =>
  String(key || "")
    .replace(/^_id$/, "ID")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDetailValue = (key, value) => {
  if (value === undefined || value === null || value === "") {
    return "N/A";
  }

  if (/date|at$/i.test(key)) {
    return escapeHTML(formatDateTime(value));
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    return escapeHTML(value.map((item) => (typeof item === "object" ? JSON.stringify(item) : item)).join(", "));
  }

  if (typeof value === "object") {
    return escapeHTML(JSON.stringify(value));
  }

  return escapeHTML(value);
};

const hiddenUserDetailKeys = new Set(["password", "__v", "submitted"]);
const preferredUserDetailKeys = [
  "id",
  "_id",
  "email",
  "firstName",
  "middleInitial",
  "lastName",
  "role",
  "gender",
  "authStatus",
  "responseCount",
  "signedUpAt",
  "createdAt",
  "updatedAt",
  "lastLoginAt",
  "completedAt",
  "lastSavedAt"
];

const buildUserDetailRows = (user) => {
  const allKeys = [
    ...preferredUserDetailKeys,
    ...Object.keys(user || {}).filter((key) => !preferredUserDetailKeys.includes(key))
  ];

  return allKeys
    .filter((key, index) => allKeys.indexOf(key) === index)
    .filter((key) => !hiddenUserDetailKeys.has(key))
    .filter((key) => user?.[key] !== undefined && user?.[key] !== null && user?.[key] !== "")
    .map(
      (key) => `
        <div>
          <dt>${escapeHTML(formatFieldLabel(key))}</dt>
          <dd>${formatDetailValue(key, user[key])}</dd>
        </div>
      `
    )
    .join("");
};

const formatUserCards = (users) => {
  if (!users.length) {
    userCards.innerHTML = `<div class="empty-state">No user records were found in the database.</div>`;
    return;
  }

  userCards.innerHTML = users
    .map(
      (user) => `
        <article class="user-card">
          <div class="user-card-top">
            <div>
              <h3>${escapeHTML(user.fullName || user.name || "Guest")}</h3>
              <p>${escapeHTML(user.email || "N/A")}</p>
            </div>
            <span class="status-pill ${user.submitted ? "submitted" : "pending"}">
              ${escapeHTML(user.authStatus || (user.submitted ? "Submitted" : "Signed up"))}
            </span>
          </div>
          <dl class="user-meta">
            ${buildUserDetailRows(user)}
          </dl>
        </article>
      `
    )
    .join("");
};

const mergeUsersWithResponses = (users, submissions) => {
  const responsesByUserId = new Map(
    submissions
      .filter((submission) => submission.userId || submission.user?.id)
      .map((submission) => [String(submission.userId || submission.user?.id), submission])
  );

  return users.map((user) => {
    const response = responsesByUserId.get(String(user.id));

    if (!response) {
      return user;
    }

    return {
      ...user,
      submitted: response.status === "Published" || Boolean(response.completedAt),
      responseCount: response.responseCount ?? user.responseCount ?? 0,
      completedAt: response.completedAt || user.completedAt || null,
      lastSavedAt: response.lastSavedAt || user.lastSavedAt || null,
      authStatus: response.status || user.authStatus
    };
  });
};

const firstUsableList = (...lists) => {
  const arrays = lists.filter(Array.isArray);
  return arrays.find((list) => list.length > 0) || arrays[0] || [];
};

const formatRows = (submissions) => {
  if (!submissions.length) {
    submissionTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">No submissions have been received so far.</td>
      </tr>
    `;
    return;
  }

  submissionTableBody.innerHTML = submissions
    .map((submission) => {
      const fullName = getSubmissionValue(
        submission,
        "fullName",
        getSubmissionValue(submission, "username", getSubmissionValue(submission, "name", "Guest"))
      );
      const email = getSubmissionValue(submission, "email");
      const gender = getSubmissionValue(submission, "gender");
      const userId = getSubmissionValue(submission, "id", getSubmissionValue(submission, "_id", ""));
      const date = getSubmissionValue(submission, "date", "In Progress");
      const responseCount = submission?.responseCount ?? 0;
      const questions = getSubmissionValue(submission, "questions", "No questions answered");
      const selectedOptions = getSubmissionValue(submission, "selectedOptions", "N/A");

      return `
        <tr>
          <td>
            <strong>${escapeHTML(fullName)}</strong>
            <span>${escapeHTML(userId)}</span>
          </td>
          <td>${escapeHTML(email)}</td>
          <td>${escapeHTML(gender)}</td>
          <td>${escapeHTML(date)}</td>
          <td>${escapeHTML(responseCount)}</td>
          <td>${escapeHTML(questions)}</td>
          <td>${escapeHTML(selectedOptions)}</td>
        </tr>
      `;
    })
    .join("");
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

const fetchDashboardData = async () => {
  try {
    const [dashboard, users, userResponses] = await Promise.all([
      fetchJson(API_ENDPOINT),
      fetchJson(USERS_ENDPOINT),
      fetchJson(USER_RESPONSES_ENDPOINT)
    ]);

    return {
      dashboard,
      users,
      userResponses
    };
  } catch (error) {
    const status = error?.status || error?.response?.status;

    if (status === 401 || status === 403) {
      handleAuthFailure();
      return null;
    }

    throw new Error(error?.data?.message || error?.response?.data?.message || error.message || "Dashboard fetch failed");
  }
};

const loadDashboard = async () => {
  setDashboardMessage("The dashboard is loading...");
  setUsersMessage("Users are loading...");
  refreshButton.disabled = true;

  try {
    const data = await fetchDashboardData();
    if (!data) {
      return;
    }

    const dashboardData = data.dashboard || {};
    const usersData = data.users || {};
    const userResponsesData = data.userResponses || {};
    const stats = dashboardData.stats || dashboardData.dashboard?.stats || {};
    const submissions = firstUsableList(
      userResponsesData.userResponses,
      userResponsesData.submissions,
      dashboardData.submissions,
      dashboardData.dashboard?.submissions
    );
    const rawUsers = usersData.users || usersData.data || [];
    const users = mergeUsersWithResponses(rawUsers, submissions);

    formatStatCards(stats);
    formatUserCards(users);
    formatRows(submissions);
    setDashboardMessage(`${submissions.length} records have been loaded from the API.`, "success");
    setUsersMessage(`${users.length} users have been loaded from the database.`, "success");
  } catch (error) {
    setDashboardMessage(error.message || "The dashboard could not be loaded.", "error");
    setUsersMessage(error.message || "The users could not be loaded.", "error");
  } finally {
    refreshButton.disabled = false;
  }
};

refreshButton?.addEventListener("click", loadDashboard);

reportsButton?.addEventListener("click", () => {
  window.location.href = "/reports";
});

logoutButton?.addEventListener("click", () => {
  handleAuthFailure();
});

loadDashboard();
