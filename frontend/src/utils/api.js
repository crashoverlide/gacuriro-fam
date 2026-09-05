import { API_URL } from "../config";

export function mediaUrl(path) {
  if (!path) return undefined;
  const p = String(path);
  if (p.startsWith("http://") || p.startsWith("https://") || p.startsWith("blob:")) {
    return p;
  }
  // Always absolute so phone + PC both load media from the API host
  return `${API_URL}${p.startsWith("/") ? p : `/${p}`}`;
}

export async function api(path, { token, method = "GET", body, formData } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !formData) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_URL}${path.startsWith("/") ? path : `/${path}`}`, {
    method,
    headers,
    body: formData ? formData : body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  return { res, data };
}

export default api;