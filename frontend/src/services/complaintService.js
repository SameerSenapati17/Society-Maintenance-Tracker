import { api } from "./api.js";

export const complaintService = {
  async createComplaint(formData) {
    const res = await api.post("/complaints", formData);
    return res.data.data.complaint;
  },

  async getMyComplaints() {
    const res = await api.get("/complaints/my");
    return res.data.data.complaints;
  },

  async getComplaintById(id) {
    const res = await api.get(`/complaints/${id}`);
    return res.data.data.complaint;
  },

  async getNotifications() {
    const res = await api.get("/complaints/notifications");
    return res.data.data.notifications || [];
  }
};
