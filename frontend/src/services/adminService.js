import { api } from "./api.js";

export const adminService = {
  async getComplaints(params = {}) {
    const res = await api.get("/admin/complaints", { params });
    return res.data.data.complaints;
  },

  async getComplaintById(id) {
    const res = await api.get(`/admin/complaints/${id}`);
    return res.data.data.complaint;
  },

  async updateStatus(id, { status, note }) {
    const res = await api.patch(`/admin/complaints/${id}/status`, { status, note });
    return res.data.data.complaint;
  },

  async updatePriority(id, { priority }) {
    const res = await api.patch(`/admin/complaints/${id}/priority`, { priority });
    return res.data.data.complaint;
  },

  async getDashboard(params = {}) {
    const res = await api.get("/admin/dashboard", { params });
    return res.data.data;
  },

  async runAiTriage(id) {
    const res = await api.post(`/admin/complaints/${id}/ai-triage`);
    return res.data.data;
  },

  async findDuplicates(id) {
    const res = await api.post(`/admin/complaints/${id}/find-duplicates`);
    return res.data.data; // { complaintId, matches }
  },

  async runVisualAnalysis(id) {
    const res = await api.post(`/admin/complaints/${id}/visual-analysis`);
    return res.data.data;
  }
};


