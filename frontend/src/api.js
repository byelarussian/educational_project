const API_URL = 'http://localhost:8000/api/v1';

function buildQuery(params) {
  const searchParams = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value)
    }
  })
  const query = searchParams.toString()
  return query ? `?${query}` : ''
}

async function request(path, options = {}) {
  const token = localStorage.getItem('token')
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  if (token) {
    headers.Authorization = `Token ${token}`
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 204) {
    return null
  }

  const responseData = await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(response.statusText || 'Request failed')
    error.status = response.status
    error.data = responseData
    throw error
  }
  return responseData
}

export function login({ username, password }) {
  return request('/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export function register({ username, email, password, password_confirm, first_name, last_name }) {
  return request('/auth/register/', {
    method: 'POST',
    body: JSON.stringify({ username, email, password, password_confirm, first_name, last_name }),
  })
}

export function fetchMe() {
  return request('/users/me/')
}

export function fetchTasks({ page, search, status, priority, categories } = {}) {
  const query = buildQuery({ page, search, status, priority, categories })
  return request(`/tasks/${query}`)
}

export function fetchCategories({ page, search } = {}) {
  const query = buildQuery({ page, search })
  return request(`/categories/${query}`)
}

export function fetchProducts({ page, search, ordering } = {}) {
  const query = buildQuery({ page, search, ordering })
  return request(`/products/${query}`)
}

export function fetchProductCategories({ page, search } = {}) {
  const query = buildQuery({ page, search })
  return request(`/product-categories/${query}`)
}

export function fetchProductsByCategory() {
  return request('/products/by_category/')
}

export function createTask(data) {
  return request('/tasks/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateTask(id, data) {
  return request(`/tasks/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function deleteTask(id) {
  return request(`/tasks/${id}/`, {
    method: 'DELETE',
  })
}

export function changeTaskStatus(id, status) {
  return request(`/tasks/${id}/change_status/`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export function createCategory(data) {
  return request('/categories/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateCategory(id, data) {
  return request(`/categories/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function deleteCategory(id) {
  return request(`/categories/${id}/`, {
    method: 'DELETE',
  })
}

export function logout() {
  return request('/auth/logout/', {
    method: 'POST',
  })
}
