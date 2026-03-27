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

  submitTask: (taskId, file, note) => {
    const fd = new FormData();
    fd.append("task_id", taskId);
    fd.append("file", file);
    if (note) fd.append("note", note);
    return http.post("/submit-task", fd);
  },

  getMyScore: (userId) =>
    http.get(`/score/${userId}`),

  // Manager
  getPendingSubmissions: () =>
    http.get("/pending-submissions"),

  reviewSubmission: (submissionId, approved, rejectionReason = "") =>
    http.post("/review-submission", {
      submission_id: submissionId,
      approved,
      rejection_reason: rejectionReason,
    }),

  getFlaggedTasks: () =>
    http.get("/flagged-tasks"),

  approveFlagged: (taskId) =>
    http.post(`/approve-flagged/${taskId}`),

  getLeaderboard: () =>
    http.get("/leaderboard"),

  uploadMeeting: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return http.post("/upload", fd);
  },
};

export default api;