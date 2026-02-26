import axios from "axios";

const API_BASE =
  process.env.REACT_APP_API_BASE || "http://localhost:8000/api/v1";

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