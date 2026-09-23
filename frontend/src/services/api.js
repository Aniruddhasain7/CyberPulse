const API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "")}/api`
  : "/api";

async function requestJson(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  let res;
  try {
    res = await fetch(url, { signal: controller.signal, ...options });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") throw new Error("Request timed out. Backend may be busy.");
    throw new Error("Backend server is offline or unreachable.");
  }
  clearTimeout(timeoutId);

  let data = null;
  try {
    data = await res.json();
  } catch {
  }

  if (!res.ok) {
    const errorMsg = data?.error || data?.message || `Server returned HTTP ${res.status}`;
    const error = new Error(errorMsg);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

export async function checkBackendHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return { online: false, status: "error" };
    const data = await res.json();
    return { online: true, ...data };
  } catch {
    return { online: false, status: "offline" };
  }
}

export async function fetchDashboardStats() {
  return await requestJson(`${API_BASE}/system/dashboard`);
}

export async function fetchTraffic(limit = 100) {
  const data = await requestJson(`${API_BASE}/traffic?limit=${limit}`);
  return Array.isArray(data) ? data : data?.traffic || [];
}

export async function clearTraffic() {
  return await requestJson(`${API_BASE}/traffic`, { method: "DELETE" });
}

export async function fetchAlerts(status = "", limit = 100) {
  const url = status
    ? `${API_BASE}/alerts?status=${encodeURIComponent(status)}&limit=${limit}`
    : `${API_BASE}/alerts?limit=${limit}`;
  const data = await requestJson(url);
  return Array.isArray(data) ? data : data?.alerts || [];
}

export async function resolveAlert(id) {
  return await requestJson(`${API_BASE}/alerts/${id}/resolve`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
  });
}

export async function updateAlertStatus(id, status) {
  return await requestJson(`${API_BASE}/alerts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

export async function resolveAllAlerts() {
  return await requestJson(`${API_BASE}/alerts/resolve-all`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
}

export async function deleteAlert(id) {
  return await requestJson(`${API_BASE}/alerts/${id}`, { method: "DELETE" });
}

export async function clearResolvedAlerts() {
  return await requestJson(`${API_BASE}/alerts/resolved`, { method: "DELETE" });
}

export async function clearAllAlerts() {
  return await requestJson(`${API_BASE}/alerts`, { method: "DELETE" });
}

export async function clearAllLogs() {
  return await requestJson(`${API_BASE}/system/logs`, { method: "DELETE" });
}

export async function simulateAttackApi(scenario = "SYN_FLOOD") {
  return await requestJson(`${API_BASE}/alerts/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario }),
  });
}

export async function fetchBlockedIps() {
  const data = await requestJson(`${API_BASE}/system/blocked`);
  return Array.isArray(data) ? data : data?.blocked || [];
}

export async function apiBlockIp({ ip, reason, packets_dropped = 0 }) {
  return await requestJson(`${API_BASE}/system/blocked`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ip, reason, packets_dropped }),
  });
}

export async function apiUnblockIp(ip) {
  return await requestJson(`${API_BASE}/system/blocked/${encodeURIComponent(ip)}`, {
    method: "DELETE",
  });
}

export async function apiClearBlockedIps() {
  return await requestJson(`${API_BASE}/system/blocked`, { method: "DELETE" });
}

export async function fetchWhitelistIps() {
  const data = await requestJson(`${API_BASE}/system/whitelist`);
  return Array.isArray(data) ? data : data?.whitelist || [];
}

export async function apiAddWhitelistIp({ ip, label }) {
  return await requestJson(`${API_BASE}/system/whitelist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ip, label }),
  });
}

export async function apiRemoveWhitelistIp(ip) {
  return await requestJson(`${API_BASE}/system/whitelist/${encodeURIComponent(ip)}`, {
    method: "DELETE",
  });
}

export async function apiClearWhitelist() {
  return await requestJson(`${API_BASE}/system/whitelist`, { method: "DELETE" });
}

export async function fetchSettings() {
  const data = await requestJson(`${API_BASE}/system/settings`);
  return data?.settings || data;
}

export async function apiSaveSettings(settings) {
  return await requestJson(`${API_BASE}/system/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
}

export async function apiResetSettings() {
  return await requestJson(`${API_BASE}/system/settings/reset`, { method: "POST" });
}

export async function startMonitoring(interfaceName = "default") {
  return await requestJson(`${API_BASE}/monitoring/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ interface: interfaceName }),
  });
}

export async function stopMonitoring() {
  return await requestJson(`${API_BASE}/monitoring/stop`, { method: "POST" });
}

export async function fetchMonitoringStatus() {
  try {
    const res = await fetch(`${API_BASE}/monitoring/status`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return { running: false, error: err.message };
  }
}
