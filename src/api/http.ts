import axios from "axios";

import { API_BASE } from "./base";

export const http = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    // ✅ NO borres el token aquí.
    // Un 401 puede ser:
    // - endpoint sin credenciales (por bug)
    // - token expirado
    // - usuario sin permisos
    // Mejor: manejarlo en AuthProvider con /auth/me o en UI.
    return Promise.reject(err);
  }
);