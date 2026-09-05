import { useCallback, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import HomePage from './pages/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import CabinetPage from './pages/CabinetPage.jsx'
import TasksPage from './pages/TasksPage.jsx'
import CategoriesPage from './pages/CategoriesPage.jsx'
import ProductsPage from './pages/ProductsPage.jsx'
import {
  addToCart,
  changeTaskStatus,
  createCategory,
  createTask,
  deleteCategory,
  deleteTask,
  fetchCart,
  fetchCategories,
  fetchMe,
  fetchProducts,
  fetchTasks,
  login,
  logout,
  register,
  updateCategory,
  updateTask,
} from './api'

/**
 * Превращает тело ошибки API в одну строку для пользователя.
 * Строка или поля error/detail берутся как есть; иначе склеиваются ошибки валидации полей.
 */
function formatAuthError(data, fallback) {
  if (!data) return fallback
  if (typeof data === 'string') return data
  if (data.error) return data.error
  if (data.detail) return data.detail

  return Object.entries(data)
    .map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(', ') : value}`)
    .join(' ')
}

/** Корневой компонент: включает BrowserRouter, чтобы вложенный AppContent мог ходить по URL. */
function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

/**
 * Оболочка приложения: хранит токен, пользователя, корзину, задачи и категории,
 * грузит данные с API и раздаёт обработчики страницам через props.
 */
function AppContent() {
  const location = useLocation()
  const navigate = useNavigate()
  const isStoreFront = ['/', '/login', '/register', '/cabinet'].includes(location.pathname)
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [user, setUser] = useState(null)
  const [cart, setCart] = useState({ items: [], total: '0', count: 0 })
  const [tasks, setTasks] = useState([])
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [taskSearch, setTaskSearch] = useState('')
  const [taskPage, setTaskPage] = useState(1)
  const [productPage, setProductPage] = useState(1)
  const [taskPagination, setTaskPagination] = useState({ next: null, previous: null, count: 0 })
  const [productPagination, setProductPagination] = useState({ next: null, previous: null, count: 0 })
  const [editingTask, setEditingTask] = useState(null)
  const [editingCategory, setEditingCategory] = useState(null)
  const [taskFormResetKey, setTaskFormResetKey] = useState(0)
  const [categoryFormResetKey, setCategoryFormResetKey] = useState(0)

  const isAuthenticated = Boolean(token && user)

  /** Подгружает страницу задач с учётом поиска и номера страницы. */
  const loadTasks = useCallback(async () => {
    try {
      const response = await fetchTasks({ page: taskPage, search: taskSearch })
      setTasks(response.results || [])
      setTaskPagination({
        next: response.next,
        previous: response.previous,
        count: response.count,
      })
    } catch (error) {
      setMessage(error.data?.detail || 'Failed to load tasks')
    }
  }, [taskPage, taskSearch])

  /** Подгружает список категорий задач. */
  const loadCategories = useCallback(async () => {
    try {
      const response = await fetchCategories()
      setCategories(response.results || [])
    } catch (error) {
      setMessage(error.data?.detail || 'Failed to load categories')
    }
  }, [])

  useEffect(() => {
    if (!token) return undefined

    let cancelled = false

    /** По токену запрашивает /users/me/; если сессия мертва — сбрасывает логин. */
    async function loadCurrentUser() {
      try {
        const me = await fetchMe()
        if (!cancelled) {
          setUser(me)
        }
      } catch {
        if (!cancelled) {
          setMessage('Session expired or backend unavailable. Please login again.')
          localStorage.removeItem('token')
          setToken('')
          setUser(null)
          setCart({ items: [], total: '0', count: 0 })
        }
      }
    }

    loadCurrentUser()
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    if (!token) return undefined

    let cancelled = false

    /** Первичная загрузка категорий после появления токена (с отменой при размонтировании). */
    async function loadCategoryList() {
      try {
        const response = await fetchCategories()
        if (!cancelled) {
          setCategories(response.results || [])
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error.data?.detail || 'Failed to load categories')
        }
      }
    }

    loadCategoryList()
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    if (!token) return undefined

    let cancelled = false

    /** Первичная и повторная загрузка задач при смене страницы/поиска. */
    async function loadTaskList() {
      try {
        const response = await fetchTasks({ page: taskPage, search: taskSearch })
        if (!cancelled) {
          setTasks(response.results || [])
          setTaskPagination({
            next: response.next,
            previous: response.previous,
            count: response.count,
          })
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error.data?.detail || 'Failed to load tasks')
        }
      }
    }

    loadTaskList()
    return () => {
      cancelled = true
    }
  }, [token, taskPage, taskSearch])

  useEffect(() => {
    if (!token) return undefined

    let cancelled = false

    /** Страница товаров админки задачника (/products), не витрина магазина. */
    async function loadProductList() {
      try {
        const response = await fetchProducts({ page: productPage })
        if (!cancelled) {
          setProducts(response.results || [])
          setProductPagination({
            next: response.next,
            previous: response.previous,
            count: response.count,
          })
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error.data?.detail || 'Failed to load products')
        }
      }
    }

    loadProductList()
    return () => {
      cancelled = true
    }
  }, [token, productPage])

  useEffect(() => {
    if (!token) return undefined

    let cancelled = false

    /** Загружает корзину текущего пользователя; при ошибке показывает пустую. */
    async function loadCurrentCart() {
      try {
        const response = await fetchCart()
        if (!cancelled) {
          setCart({
            items: response.items || [],
            total: response.total || '0',
            count: response.count || 0,
          })
        }
      } catch {
        if (!cancelled) {
          setCart({ items: [], total: '0', count: 0 })
        }
      }
    }

    loadCurrentCart()
    return () => {
      cancelled = true
    }
  }, [token])

  /** Вход: сохраняет токен в localStorage и кладёт user в state. */
  async function handleLogin(credentials) {
    setLoading(true)
    setMessage('')
    try {
      const response = await login(credentials)
      localStorage.setItem('token', response.token)
      setToken(response.token)
      setUser(response.user)
      setMessage('Вход выполнен')
    } catch (error) {
      setMessage(error.data?.error || 'Не удалось войти')
    } finally {
      setLoading(false)
    }
  }

  /** Регистрация: создаёт аккаунт, логинит и переводит в кабинет. */
  async function handleRegister(formData) {
    setLoading(true)
    setMessage('')
    try {
      const response = await register({
        ...formData,
        password_confirm: formData.password_confirm || formData.password,
      })
      localStorage.setItem('token', response.token)
      setToken(response.token)
      setUser(response.user)
      setMessage('Регистрация прошла успешно')
      navigate('/cabinet')
    } catch (error) {
      setMessage(formatAuthError(error.data, 'Не удалось создать аккаунт'))
    } finally {
      setLoading(false)
    }
  }

  /** Выход: просит сервер удалить токен и очищает локальное состояние. */
  async function handleLogout() {
    setLoading(true)
    try {
      await logout()
    } catch {
      // ignore logout errors
    }
    localStorage.removeItem('token')
    setToken('')
    setUser(null)
    setCart({ items: [], total: '0', count: 0 })
    setTasks([])
    setCategories([])
    setMessage('Logged out')
    setLoading(false)
  }

  /** Создаёт задачу и сбрасывает форму (через formResetKey). */
  async function handleCreateTask(taskData) {
    setLoading(true)
    setMessage('')
    try {
      await createTask({
        ...taskData,
        due_date: taskData.due_date || null,
      })
      setEditingTask(null)
      setTaskFormResetKey((key) => key + 1)
      setMessage('Task created successfully')
      await loadTasks()
    } catch (error) {
      setMessage(error.data?.detail || 'Failed to create task')
    } finally {
      setLoading(false)
    }
  }

  /** Сохраняет правки задачи и выходит из режима редактирования. */
  async function handleUpdateTask(taskId, taskData) {
    setLoading(true)
    setMessage('')
    try {
      await updateTask(taskId, {
        ...taskData,
        due_date: taskData.due_date || null,
      })
      setEditingTask(null)
      setTaskFormResetKey((key) => key + 1)
      setMessage('Task saved successfully')
      await loadTasks()
    } catch (error) {
      setMessage(error.data?.detail || 'Failed to save task')
    } finally {
      setLoading(false)
    }
  }

  /** Удаляет задачу и обновляет список. */
  async function handleDeleteTask(taskId) {
    setLoading(true)
    setMessage('')
    try {
      await deleteTask(taskId)
      setMessage('Task removed')
      await loadTasks()
    } catch (error) {
      setMessage(error.data?.detail || 'Failed to remove task')
    } finally {
      setLoading(false)
    }
  }

  /** Меняет статус задачи (в работе / готово) отдельным эндпоинтом. */
  async function handleStatusChange(taskId, status) {
    setLoading(true)
    setMessage('')
    try {
      await changeTaskStatus(taskId, status)
      setMessage('Task status updated')
      await loadTasks()
    } catch (error) {
      setMessage(error.data?.error || 'Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  /** Создаёт категорию задач и сбрасывает форму. */
  async function handleCreateCategory(categoryData) {
    setLoading(true)
    setMessage('')
    try {
      await createCategory(categoryData)
      setEditingCategory(null)
      setCategoryFormResetKey((key) => key + 1)
      setMessage('Category created successfully')
      await loadCategories()
    } catch (error) {
      setMessage(error.data?.detail || 'Failed to create category')
    } finally {
      setLoading(false)
    }
  }

  /** Сохраняет правки категории задач. */
  async function handleUpdateCategory(categoryId, categoryData) {
    setLoading(true)
    setMessage('')
    try {
      await updateCategory(categoryId, categoryData)
      setEditingCategory(null)
      setCategoryFormResetKey((key) => key + 1)
      setMessage('Category updated')
      await loadCategories()
    } catch (error) {
      setMessage(error.data?.detail || 'Failed to update category')
    } finally {
      setLoading(false)
    }
  }

  /** Удаляет категорию и перезагружает и категории, и задачи (связи могли измениться). */
  async function handleDeleteCategory(categoryId) {
    setLoading(true)
    setMessage('')
    try {
      await deleteCategory(categoryId)
      setEditingCategory(null)
      setMessage('Category deleted')
      await loadCategories()
      await loadTasks()
    } catch (error) {
      setMessage(error.data?.detail || 'Failed to delete category')
    } finally {
      setLoading(false)
    }
  }

  /** Открывает форму редактирования выбранной задачи. */
  function handleEditTask(task) {
    setEditingTask(task)
  }

  /** Закрывает форму редактирования задачи без сохранения. */
  function handleCancelEditTask() {
    setEditingTask(null)
  }

  /** Открывает форму редактирования выбранной категории. */
  function handleEditCategory(category) {
    setEditingCategory(category)
  }

  /** Закрывает форму редактирования категории без сохранения. */
  function handleCancelEditCategory() {
    setEditingCategory(null)
  }

  /** Переключает страницу списка задач, игнорируя номера меньше 1. */
  function handlePageChange(newPage) {
    if (newPage >= 1) {
      setTaskPage(newPage)
    }
  }

  /** Добавляет товар в корзину; гостя отправляет на /login. Возвращает { ok } для карточки. */
  async function handleAddToCart(product) {
    if (!isAuthenticated) {
      setMessage('Войдите, чтобы добавить товар в корзину')
      navigate('/login')
      return { ok: false, message: 'Войдите, чтобы добавить товар в корзину' }
    }

    try {
      const nextCart = await addToCart({ product_id: product.id, quantity: 1 })
      setCart({
        items: nextCart.items || [],
        total: nextCart.total || '0',
        count: nextCart.count || 0,
      })
      return { ok: true }
    } catch (error) {
      return { ok: false, message: error.data?.error || 'Не удалось добавить товар' }
    }
  }

  /** Подменяет токен после смены пароля, чтобы старый ключ больше не использовался. */
  function handleTokenChange(nextToken) {
    localStorage.setItem('token', nextToken)
    setToken(nextToken)
  }

  /** Синхронизирует state корзины с ответом API (кабинет: количество, удаление, checkout). */
  function handleCartChange(nextCart) {
    setCart({
      items: nextCart?.items || [],
      total: nextCart?.total || '0',
      count: nextCart?.count || 0,
    })
  }

  return (
    <div className={isStoreFront ? 'store-shell' : 'app-shell'}>
        {isAuthenticated && !isStoreFront && (
          <header className="app-header">
            <div>
              <h1>Менеджер Задач</h1>
              <p>React + Django REST интеграция</p>
            </div>
            <div className="header-actions">
              <nav className="main-nav">
                <Link to="/">Магазин</Link>
                <Link to="/tasks">Задачи</Link>
                <Link to="/categories">Категории</Link>
                <Link to="/products">Товары</Link>
              </nav>
              <span>{user?.username}</span>
              <button onClick={handleLogout} disabled={loading}>
                Выход
              </button>
            </div>
          </header>
        )}

        <main className={isStoreFront ? 'store-main' : 'app-main'}>
          {message && !isStoreFront && <div className="message">{message}</div>}

          <Routes>
            <Route
              path="/"
              element={
                <HomePage
                  user={user}
                  isAuthenticated={isAuthenticated}
                  onLogout={handleLogout}
                  onLogin={handleLogin}
                  onRegister={handleRegister}
                  loading={loading}
                  message={message}
                  setMessage={setMessage}
                  cartCount={cart.count}
                  onAddToCart={handleAddToCart}
                />
              }
            />
            <Route
              path="/login"
              element={
                !isAuthenticated ? (
                  <LoginPage
                    onLogin={handleLogin}
                    onRegister={handleRegister}
                    loading={loading}
                    message={message}
                    setMessage={setMessage}
                  />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route
              path="/register"
              element={
                !isAuthenticated ? (
                  <RegisterPage
                    onLogin={handleLogin}
                    onRegister={handleRegister}
                    loading={loading}
                    message={message}
                    setMessage={setMessage}
                  />
                ) : (
                  <Navigate to="/cabinet" replace />
                )
              }
            />
            <Route
              path="/cabinet"
              element={
                token && !user ? (
                  <div className="store-page cabinet-page">
                    <p className="cabinet-loading">Загрузка кабинета…</p>
                  </div>
                ) : isAuthenticated ? (
                  <CabinetPage
                    user={user}
                    cart={cart}
                    loading={loading}
                    message={message}
                    setMessage={setMessage}
                    onUserUpdate={setUser}
                    onCartChange={handleCartChange}
                    onTokenChange={handleTokenChange}
                    onLogout={handleLogout}
                    onLogin={handleLogin}
                    onRegister={handleRegister}
                    isAuthenticated={isAuthenticated}
                  />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/tasks"
              element={
                isAuthenticated ? (
                  <TasksPage
                    tasks={tasks}
                    categories={categories}
                    loading={loading}
                    message={message}
                    search={taskSearch}
                    page={taskPage}
                    pagination={taskPagination}
                    onSearch={(value) => {
                      setTaskSearch(value)
                      setTaskPage(1)
                    }}
                    onPageChange={handlePageChange}
                    onEditTask={handleEditTask}
                    onCreateTask={handleCreateTask}
                    onUpdateTask={handleUpdateTask}
                    onDeleteTask={handleDeleteTask}
                    onStatusChange={handleStatusChange}
                    editingTask={editingTask}
                    onCancelEdit={handleCancelEditTask}
                    formResetKey={taskFormResetKey}
                  />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/categories"
              element={
                isAuthenticated ? (
                  <CategoriesPage
                    categories={categories}
                    loading={loading}
                    message={message}
                    onCreateCategory={handleCreateCategory}
                    onUpdateCategory={handleUpdateCategory}
                    onDeleteCategory={handleDeleteCategory}
                    editingCategory={editingCategory}
                    onEditCategory={handleEditCategory}
                    onCancelEdit={handleCancelEditCategory}
                    formResetKey={categoryFormResetKey}
                  />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/products"
              element={
                isAuthenticated ? (
                  <ProductsPage
                    products={products}
                    loading={loading}
                    message={message}
                    page={productPage}
                    pagination={productPagination}
                    onPageChange={(newPage) => {
                      if (newPage >= 1) setProductPage(newPage)
                    }}
                  />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
          </Routes>
        </main>
      </div>
  )
}

export default App
