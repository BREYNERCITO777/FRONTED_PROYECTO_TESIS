import { http } from "./http";

export type Role = "admin" | "operator";

export type UserOut = {
  id: string;        // ✅ sin guión bajo, string en vez de any
  name: string;
  email: string;
  role: Role;
  estado?: number;
  created_at?: string | null;
};

export async function listUsers(limit = 500) {
  const { data } = await http.get<UserOut[]>(`/users`, { params: { limit } });
  return data;
}

export async function createUser(payload: any) {
  const { data } = await http.post(`/users`, payload);
  return data;
}

export async function updateUser(userId: string, payload: any) {
  const { data } = await http.patch(`/users/${userId}`, payload);
  return data;
}

export async function setUserRole(userId: string, role: Role) {
  const { data } = await http.patch(`/users/${userId}/role`, null, { params: { role } });
  return data;
}

export async function setUserEstado(userId: string, estado: 0 | 1) {
  const { data } = await http.patch(`/users/${userId}/estado`, { estado });
  return data;
}

export async function deleteUser(userId: string) {
  const { data } = await http.delete(`/users/${userId}`);
  return data;
}