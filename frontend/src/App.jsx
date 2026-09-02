import { useCallback, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import './App.css'
import HomePage from './pages/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import TasksPage from './pages/TasksPage.jsx'
import CategoriesPage from './pages/CategoriesPage.jsx'
import ProductsPage from './pages/ProductsPage.jsx'
import {
  changeTaskStatus,
  createCategory,
  createTask,
  deleteCategory,
  deleteTask,
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

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

function AppContent() {
  const location = useLocation()
  const isStoreHome = location.pathname === '/'
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [user, setUser] = useState(null)
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

  async function handleLogin(credentials) {
    setLoading(true)
    setMessage('')
    try {
      const response = await login(credentials)
      localStorage.setItem('token', response.token)
      setToken(response.token)
      setUser(response.user)
      setMessage('Login successful')
    } catch (error) {
      setMessage(error.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(formData) {
    setLoading(true)
    setMessage('')
    try {
      const response = await register({
        ...formData,
        password_confirm: formData.password,
      })
      localStorage.setItem('token', response.token)
      setToken(response.token)
      setUser(response.user)
      setMessage('Registration successful')
    } catch (error) {
      setMessage(error.data ? JSON.stringify(error.data) : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

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
    setTasks([])
    setCategories([])
    setMessage('Logged out')
    setLoading(false)
  }

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

  function handleEditTask(task) {
    setEditingTask(task)
  }

  function handleCancelEditTask() {
    setEditingTask(null)
  }

  function handleEditCategory(category) {
    setEditingCategory(category)
  }

  function handleCancelEditCategory() {
    setEditingCategory(null)
  }

  function handlePageChange(newPage) {
    if (newPage >= 1) {
      setTaskPage(newPage)
    }
  }

  return (
    <div className={isStoreHome ? 'store-shell' : 'app-shell'}>
        {isAuthenticated && !isStoreHome && (
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

        <main className={isStoreHome ? 'store-main' : 'app-main'}>
          {message && !isStoreHome && <div className="message">{message}</div>}

          <Routes>
            <Route
              path="/"
              element={
                <HomePage
                  user={user}
                  isAuthenticated={isAuthenticated}
                  onLogout={handleLogout}
                />
              }
            />
            <Route
              path="/login"
              element={
                !isAuthenticated ? (
                  <LoginPage onLogin={handleLogin} loading={loading} message={message} setMessage={setMessage} />
                ) : (
                  <Navigate to="/tasks" replace />
                )
              }
            />
            <Route
              path="/register"
              element={
                !isAuthenticated ? (
                  <RegisterPage onRegister={handleRegister} loading={loading} message={message} setMessage={setMessage} />
                ) : (
                  <Navigate to="/tasks" replace />
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
