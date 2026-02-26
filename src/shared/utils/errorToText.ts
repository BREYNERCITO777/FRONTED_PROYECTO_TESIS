export function errorToText(err: any): string {
  const detail = err?.response?.data?.detail ?? err?.detail ?? err;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((x: any) => {
        const loc = Array.isArray(x?.loc) ? x.loc.join(".") : String(x?.loc ?? "");
        const msg = String(x?.msg ?? "Error");
        return loc ? `${loc}: ${msg}` : msg;
      })
      .join(" | ");
  }

  if (detail && typeof detail === "object") {
    const loc = Array.isArray(detail?.loc) ? detail.loc.join(".") : "";
    const msg = String(detail?.msg ?? "Error");
    if (loc || msg) return loc ? `${loc}: ${msg}` : msg;
    return JSON.stringify(detail);
  }

  return String(detail ?? "Error");
}