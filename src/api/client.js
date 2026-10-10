/**
 * Same-origin API client. Identity lives in httpOnly cookies set by the server,
 * so no tokens or ids are ever stored in (or readable by) page JavaScript.
 * The X-Requested-With header is part of the server's CSRF protection.
 */
async function request(path, { method = "GET", body } = {}) {
  let response;
  try {
    response = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-Requested-With": "fetch" },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Can't reach the server. Please check your connection and try again.");
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    /* empty body */
  }

  if (!response.ok) {
    const err = new Error(data?.error || `Request failed (${response.status})`);
    err.status = response.status;
    throw err;
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body: body || {} }),
  put: (path, body) => request(path, { method: "PUT", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
};
