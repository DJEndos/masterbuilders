// Shared API helper for all frontend pages
const API_BASE = 'https://masterbuilders-5zhc.onrender.com/api';

function getToken() { return localStorage.getItem('mis_token'); }
function getUser() { try { return JSON.parse(localStorage.getItem('mis_user')); } catch { return null; } }
function setSession(token, user) {
  localStorage.setItem('mis_token', token);
  localStorage.setItem('mis_user', JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem('mis_token');
  localStorage.removeItem('mis_user');
}

async function apiRequest(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({ success: false, message: 'Unexpected server response.' }));
  if (res.status === 401 && auth) {
    clearSession();
    window.location.href = '/index.html';
    return;
  }
  if (!res.ok || data.success === false) {
    throw new Error(data.message || 'Something went wrong.');
  }
  return data;
}

function requireRole(...roles) {
  const user = getUser();
  const token = getToken();
  if (!token || !user || !roles.includes(user.role)) {
    window.location.href = '/index.html';
    return null;
  }
  return user;
}

function showAlert(containerEl, message, type = 'error') {
  containerEl.innerHTML = `<div class="alert ${type}">${message}</div>`;
  if (type !== 'error') setTimeout(() => { containerEl.innerHTML = ''; }, 4000);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, (m) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}
