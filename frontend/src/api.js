const API_URL = 'http://localhost:8000/api/v1';

/**
 * Собирает query-строку из объекта параметров.
 * Пустые, null и undefined значения пропускает, чтобы не слать `?page=`.
 * @param {Record<string, unknown>} [params]
 * @returns {string} либо `?key=value&...`, либо пустая строка
 */
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

/**
 * Общий HTTP-клиент к Django API.
 * Берёт токен из localStorage и ставит заголовок `Authorization: Token ...`.
 * 204 (удаление без тела) возвращает null. Любой не-ok ответ бросает Error с полями status и data.
 * @param {string} path путь относительно /api/v1, например `/tasks/`
 * @param {RequestInit} [options] method, body, дополнительные headers
 */
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

/** POST /auth/login/ — вход по логину и паролю, ответ { user, token }. */
export function login({ username, password }) {
  return request('/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

/** POST /auth/register/ — регистрация; пароль нужно передать дважды (password_confirm). */
export function register({ username, email, password, password_confirm, first_name, last_name }) {
  return request('/auth/register/', {
    method: 'POST',
    body: JSON.stringify({ username, email, password, password_confirm, first_name, last_name }),
  })
}

/** GET /users/me/ — текущий профиль (имя, email, телефон, адрес). */
export function fetchMe() {
  return request('/users/me/')
}

/** GET /tasks/ — список задач с пагинацией, поиском и фильтрами статуса/приоритета/категорий. */
export function fetchTasks({ page, search, status, priority, categories } = {}) {
  const query = buildQuery({ page, search, status, priority, categories })
  return request(`/tasks/${query}`)
}

/** GET /categories/ — категории задач (не товарные). */
export function fetchCategories({ page, search } = {}) {
  const query = buildQuery({ page, search })
  return request(`/categories/${query}`)
}

/** GET /products/ — страница каталога товаров витрины. */
export function fetchProducts({ page, search, ordering } = {}) {
  const query = buildQuery({ page, search, ordering })
  return request(`/products/${query}`)
}

/** GET /product-categories/ — список товарных категорий FamShop. */
export function fetchProductCategories({ page, search } = {}) {
  const query = buildQuery({ page, search })
  return request(`/product-categories/${query}`)
}

/** GET /products/by_category/ — товары, сгруппированные по категориям, для главной витрины. */
export function fetchProductsByCategory() {
  return request('/products/by_category/')
}

/** POST /tasks/ — создаёт задачу текущего пользователя. */
export function createTask(data) {
  return request('/tasks/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** PATCH /tasks/:id/ — частичное обновление задачи. */
export function updateTask(id, data) {
  return request(`/tasks/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/** DELETE /tasks/:id/ — удаляет задачу. */
export function deleteTask(id) {
  return request(`/tasks/${id}/`, {
    method: 'DELETE',
  })
}

/** PATCH /tasks/:id/change_status/ — меняет только статус (todo / in_progress / completed). */
export function changeTaskStatus(id, status) {
  return request(`/tasks/${id}/change_status/`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

/** POST /categories/ — создаёт категорию задач. */
export function createCategory(data) {
  return request('/categories/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** PATCH /categories/:id/ — обновляет категорию задач. */
export function updateCategory(id, data) {
  return request(`/categories/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/** DELETE /categories/:id/ — удаляет категорию задач. */
export function deleteCategory(id) {
  return request(`/categories/${id}/`, {
    method: 'DELETE',
  })
}

/** POST /auth/logout/ — инвалидирует токен на сервере. */
export function logout() {
  return request('/auth/logout/', {
    method: 'POST',
  })
}

/** PATCH /users/me/ — сохраняет имя, email, телефон или адрес доставки. */
export function updateMe(data) {
  return request('/users/me/', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/** POST /users/change_password/ — смена пароля; в ответе новый token вместо старого. */
export function changePassword({ old_password, new_password }) {
  return request('/users/change_password/', {
    method: 'POST',
    body: JSON.stringify({ old_password, new_password }),
  })
}

/** GET /cart/ — корзина: items, total, count. */
export function fetchCart() {
  return request('/cart/')
}

/** POST /cart/ — кладёт товар выбранного размера в корзину. */
export function addToCart({ product_id, size, quantity = 1 }) {
  return request('/cart/', {
    method: 'POST',
    body: JSON.stringify({ product_id, size, quantity }),
  })
}

/** PATCH /cart/:id/ — ставит новое количество позиции. */
export function updateCartItem(id, quantity) {
  return request(`/cart/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity }),
  })
}

/** DELETE /cart/:id/ — убирает позицию из корзины. */
export function removeCartItem(id) {
  return request(`/cart/${id}/`, {
    method: 'DELETE',
  })
}

/** POST /cart/checkout/ — оформляет заказ авторизованного пользователя (можно передать контакты). */
export function checkoutCart(payload = {}) {
  return request('/cart/checkout/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** POST /cart/guest-checkout/ — заказ без регистрации: контакты + позиции корзины. */
export function guestCheckout(payload) {
  return request('/cart/guest-checkout/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** GET /orders/ — заказы текущего пользователя для вкладки кабинета. */
export function fetchOrders() {
  return request('/orders/')
}
