import { api } from "./api.js";

export const authService = {
  async login(email, password) {
    const res = await api.post("/auth/login", { email, password });
    return res.data.data;
  },

  async register(payload) {
    const res = await api.post("/auth/register", payload);
    return res.data.data;
  },

  async getMe() {
    const res = await api.get("/auth/me");
    return res.data.data.user;
  }
};
