import { api } from "./api.js";

export const noticeService = {
  async getNotices() {
    const res = await api.get("/notices");
    return res.data.data.notices;
  },

  async createNotice(payload) {
    const res = await api.post("/admin/notices", payload);
    return res.data.data.notice;
  },

  async updateNotice(id, payload) {
    const res = await api.patch(`/admin/notices/${id}`, payload);
    return res.data.data.notice;
  },

  async deleteNotice(id) {
    const res = await api.delete(`/admin/notices/${id}`);
    return res.data;
  }
};
