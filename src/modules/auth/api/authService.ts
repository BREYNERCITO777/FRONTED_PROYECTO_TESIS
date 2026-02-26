import { http } from "../../../api/http";

export type LoginPayload = {
  email: string;
  password: string;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
};

export type User = {
  id: string;
  email: string;
  role?: string;
};

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await http.post<AuthResponse>("/auth/login", payload);
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await http.get<User>("/auth/me");
  return data;
}

export async function register(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await http.post<AuthResponse>("/auth/register", payload);
  return data;
}