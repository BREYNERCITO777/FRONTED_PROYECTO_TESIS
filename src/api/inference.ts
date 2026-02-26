import { http } from "./http";

export async function detectImage(file: File) {
  const form = new FormData();
  form.append("file", file);

  const res = await http.post("/detectar", form);
  return res.data;
}
