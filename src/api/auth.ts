import { http } from "./http";

export async function login(email: string, password: string) {
  const { data } = await http.post("/auth/login", { email, password });
  localStorage.setItem("token", data.access_token);
  return data;
}

export async function me() {
  const { data } = await http.get("/auth/me");
  return data;
}

export function logout() {
  localStorage.removeItem("token");
}