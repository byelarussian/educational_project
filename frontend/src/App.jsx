import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import './App.css'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import TasksPage from './pages/TasksPage.jsx'
import CategoriesPage from './pages/CategoriesPage.jsx'
import {
  changeTaskStatus,
  createCategory,
  createTask,
  deleteCategory,
  deleteTask,
  fetchCategories,
  fetchMe,
  fetchTasks,
  login,
  logout,
  register,
  updateCategory,
  updateTask,
} from './api'

const initialTaskForm = {
  title: '',
  description: '',
  priority: 'medium',
  status: 'todo',
  due_date: '',
  category_ids: [],
}

const initialCategoryForm = {
  name: '',
  description: '',
  color: '#007bff',
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [user, setUser] = useState(null)
  const [tasks, setTasks] = useState([])
  const [categories, setCategories] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [taskSearch, setTaskSearch] = useState('')
  const [taskPage, setTaskPage] = useState(1)
  const [taskPagination, setTaskPagination] = useState({ next: null, previous: null, count: 0 })
  const [editingTask, setEditingTask] = useState(null)
  const [editingCategory, setEditingCategory] = useState(null)

  const isAuthenticated = Boolean(token && user)

  useEffect(() => {
    if (token) {
      loadCurrentUser()
    }
  }, [token])

  useEffect(() => {
    if (token) {
      loadTasks()
    }
  }, [token, taskPage, taskSearch])

  async function loadCurrentUser() {
    setLoading(true)
    try {
      const me = await fetchMe()
      setUser(me)
      await loadCategories()
      await loadTasks()
    } catch (error) {
      setMessage('Session expired or backend unavailable. Please login again.')
      localStorage.removeItem('token')
      setToken('')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  async function loadTasks() {
    setLoading(true)
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
    } finally {
      setLoading(false)
    }
  }

  async function loadCategories() {
    setLoading(true)
    try {
      const response = await fetchCategories()
      setCategories(response.results || [])
    } catch (error) {
      setMessage(error.data?.detail || 'Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(credentials) {
    setLoading(true)
    setMessage('')
    try {
      const response = await login(credentials)
      localStorage.setItem('token', response.token)
      setToken(response.token)
      setUser(response.user)
      await loadCategories()
      await loadTasks()
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
      await loadCategories()
      await loadTasks()
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
    <BrowserRouter>
      <div className="app-shell">
        <header className="app-header">
          <div>
            <h1>Task Manager</h1>
            <p>React + Django REST integration</p>
          </div>
          {isAuthenticated && (
            <div className="header-actions">
              <nav className="main-nav">
                <Link to="/tasks">Tasks</Link>
                <Link to="/categories">Categories</Link>
              </nav>
              <span>{user?.username}</span>
              <button onClick={handleLogout} disabled={loading}>
                Logout
              </button>
            </div>
          )}
        </header>

        <main className="app-main">
          {message && <div className="message">{message}</div>}

          <Routes>
            <Route
              path="/"
              element={isAuthenticated ? <Navigate to="/tasks" replace /> : <Navigate to="/login" replace />}
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
                  />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
