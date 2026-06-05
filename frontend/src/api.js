const API_URL = 'http://localhost:8000/api/v1';

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Token ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const responseData = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(response.statusText || 'Request failed');
    error.status = response.status;
    error.data = responseData;
    throw error;
  }
  return responseData;
}

export function login({ username, password }) {
  return request('/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function register({ username, email, password, password_confirm, first_name, last_name }) {
  return request('/auth/register/', {
    method: 'POST',
    body: JSON.stringify({ username, email, password, password_confirm, first_name, last_name }),
  });
}

export function fetchMe() {
  return request('/users/me/');
}

export function fetchTasks() {
  return request('/tasks/');
}

export function fetchCategories() {
  return request('/categories/');
}

export function createTask(data) {
  return request('/tasks/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function changeTaskStatus(id, status) {
  return request(`/tasks/${id}/change_status/`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function logout() {
  return request('/auth/logout/', {
    method: 'POST',
  });
}
