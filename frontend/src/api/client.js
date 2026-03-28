// ── API client ───────────────────────────────────────────────────────────────
// All axios calls go here. Swap MOCK_* imports in pages with these once backend
// is running (Step E from session doc).
//
// Usage example:
//   import api from '../api/client';
//   const tasks = await api.getMyTasks(userId);

import axios from "axios";

const BASE = "http://127.0.0.1:8000";

const http = axios.create({ baseURL: BASE });

const api = {
  // Auth
  login: (employeeId, password) =>
    http.post("/login", { employee_id: employeeId, password }),

  // Employee
  getMyTasks: (userId) =>
    http.get(`/my-tasks/${userId}`),

  submitTask: (actionItemId, employeeId, file) => {
    const fd = new FormData();
    fd.append("action_item_id", actionItemId);
    fd.append("employee_id", employeeId);
    fd.append("file", file);
    return http.post("/submit-task", fd);
  },

  getMyScore: (userId) =>
    http.get(`/score/${userId}`),

  // Manager
  getPendingSubmissions: () =>
    http.get("/pending-submissions"),

  reviewSubmission: (submissionId, action, rejectionReason = "") =>
    http.post("/review-submission", {
      submission_id: submissionId,
      action,
      rejection_reason: rejectionReason,
    }),

  getFlaggedTasks: () =>
    http.get("/flagged-tasks"),

  approveFlagged: (taskId) =>
    http.post(`/approve-flagged/${taskId}`),

  getLeaderboard: () =>
    http.get("/leaderboard"),

  getMeetings: () =>
    http.get("/meetings"),

  getEmployeesStatus: () =>
    http.get("/employees-status"),

  getEscalationSummary: () =>
    http.get("/escalation-summary"),

  uploadMeeting: (file, title, managerId) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", title);
    fd.append("manager_id", String(managerId));
    return http.post("/upload", fd);
  },
};

export default api;