import { useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  changeTaskStatus,
  createTask,
  fetchCategories,
  fetchMe,
  fetchTasks,
  login,
  logout,
  register,
} from './api'

const initialTaskForm = {
  title: '',
  description: '',
  priority: 'medium',
  status: 'todo',
  due_date: '',
  category_ids: [],
}

function App() {
  const [isRegister, setIsRegister] = useState(false)
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [user, setUser] = useState(null)
  const [tasks, setTasks] = useState([])
  const [categories, setCategories] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [authData, setAuthData] = useState({ username: '', password: '', email: '', first_name: '', last_name: '' })
  const [taskForm, setTaskForm] = useState(initialTaskForm)

  const isAuthenticated = Boolean(token && user)

  useEffect(() => {
    if (token) {
      loadCurrentUser()
    }
  }, [token])

  const authHeaders = useMemo(() => {
    return token ? { Authorization: `Token ${token}` } : {}
  }, [token])

  async function loadCurrentUser() {
    setLoading(true)
    try {
      const me = await fetchMe()
      setUser(me)
      await loadTasksAndCategories()
    } catch (error) {
      setMessage('Session expired or backend unavailable. Please login again.')
      localStorage.removeItem('token')
      setToken('')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  async function loadTasksAndCategories() {
    setLoading(true)
    try {
      const tasksResponse = await fetchTasks()
      const categoriesResponse = await fetchCategories()
      setTasks(tasksResponse.results || [])
      setCategories(categoriesResponse.results || [])
    } catch (error) {
      setMessage(error.data?.error || 'Failed to load tasks or categories')
    } finally {
      setLoading(false)
    }
  }

  async function handleLoginSubmit(event) {
    event.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      const response = await login({ username: authData.username, password: authData.password })
      localStorage.setItem('token', response.token)
      setToken(response.token)
      setUser(response.user)
      setAuthData({ username: '', password: '', email: '', first_name: '', last_name: '' })
      setMessage('Login successful')
      await loadTasksAndCategories()
    } catch (error) {
      setMessage(error.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegisterSubmit(event) {
    event.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      const response = await register({
        username: authData.username,
        email: authData.email,
        password: authData.password,
        password_confirm: authData.password,
        first_name: authData.first_name,
        last_name: authData.last_name,
      })
      localStorage.setItem('token', response.token)
      setToken(response.token)
      setUser(response.user)
      setAuthData({ username: '', password: '', email: '', first_name: '', last_name: '' })
      setMessage('Registration successful')
      await loadTasksAndCategories()
    } catch (error) {
      const errorText = error.data ? JSON.stringify(error.data) : 'Registration failed'
      setMessage(errorText)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    setLoading(true)
    try {
      await logout()
    } catch (error) {
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

  async function handleTaskSubmit(event) {
    event.preventDefault()
    setMessage('')
    setLoading(true)

    const payload = {
      title: taskForm.title,
      description: taskForm.description,
      priority: taskForm.priority,
      status: taskForm.status,
      due_date: taskForm.due_date || null,
      category_ids: taskForm.category_ids,
    }

    try {
      await createTask(payload)
      setTaskForm(initialTaskForm)
      setMessage('Task created successfully')
      await loadTasksAndCategories()
    } catch (error) {
      setMessage(error.data?.detail || 'Failed to create task')
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(taskId, statusValue) {
    setLoading(true)
    try {
      await changeTaskStatus(taskId, statusValue)
      setMessage('Task status updated')
      await loadTasksAndCategories()
    } catch (error) {
      setMessage(error.data?.error || 'Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  const sortedTasks = [...tasks].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Task Manager</h1>
          <p>React + Django REST integration</p>
        </div>
        {isAuthenticated && (
          <div className="header-actions">
            <span>{user?.username}</span>
            <button onClick={handleLogout} disabled={loading}>
              Logout
            </button>
          </div>
        )}
      </header>

      <main className="app-main">
        {message && <div className="message">{message}</div>}

        {!isAuthenticated ? (
          <section className="auth-panel">
            <div className="auth-switch">
              <button
                className={!isRegister ? 'active' : ''}
                onClick={() => setIsRegister(false)}
                type="button"
              >
                Login
              </button>
              <button
                className={isRegister ? 'active' : ''}
                onClick={() => setIsRegister(true)}
                type="button"
              >
                Register
              </button>
            </div>

            <form onSubmit={isRegister ? handleRegisterSubmit : handleLoginSubmit} className="auth-form">
              {isRegister && (
                <>
                  <label>
                    Email
                    <input
                      type="email"
                      value={authData.email}
                      onChange={(event) => setAuthData({ ...authData, email: event.target.value })}
                      required
                    />
                  </label>
                  <label>
                    First name
                    <input
                      type="text"
                      value={authData.first_name}
                      onChange={(event) => setAuthData({ ...authData, first_name: event.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Last name
                    <input
                      type="text"
                      value={authData.last_name}
                      onChange={(event) => setAuthData({ ...authData, last_name: event.target.value })}
                      required
                    />
                  </label>
                </>
              )}

              <label>
                Username
                <input
                  type="text"
                  value={authData.username}
                  onChange={(event) => setAuthData({ ...authData, username: event.target.value })}
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={authData.password}
                  onChange={(event) => setAuthData({ ...authData, password: event.target.value })}
                  required
                />
              </label>

              <button type="submit" disabled={loading}>
                {isRegister ? 'Register' : 'Login'}
              </button>
            </form>
          </section>
        ) : (
          <section className="tasks-panel">
            <div className="tasks-header">
              <h2>Your Tasks</h2>
              <button onClick={loadTasksAndCategories} disabled={loading}>
                Refresh
              </button>
            </div>

            <form className="task-form" onSubmit={handleTaskSubmit}>
              <h3>Create New Task</h3>
              <label>
                Title
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })}
                  required
                />
              </label>
              <label>
                Description
                <textarea
                  value={taskForm.description}
                  onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })}
                />
              </label>
              <label>
                Priority
                <select
                  value={taskForm.priority}
                  onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
              <label>
                Status
                <select
                  value={taskForm.status}
                  onChange={(event) => setTaskForm({ ...taskForm, status: event.target.value })}
                >
                  <option value="todo">Todo</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
              <label>
                Due date
                <input
                  type="datetime-local"
                  value={taskForm.due_date}
                  onChange={(event) => setTaskForm({ ...taskForm, due_date: event.target.value })}
                />
              </label>
              <label>
                Categories
                <select
                  multiple
                  value={taskForm.category_ids}
                  onChange={(event) => {
                    const selected = Array.from(event.target.selectedOptions, (option) => Number(option.value))
                    setTaskForm({ ...taskForm, category_ids: selected })
                  }}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" disabled={loading}>
                Create Task
              </button>
            </form>

            <div className="task-list">
              {sortedTasks.length === 0 ? (
                <p>No tasks yet. Create one to get started.</p>
              ) : (
                sortedTasks.map((task) => (
                  <article className="task-item" key={task.id}>
                    <div className="task-meta">
                      <strong>{task.title}</strong>
                      <span>{task.priority}</span>
                      <span>{task.status}</span>
                    </div>
                    <p>{task.description || 'No description'}</p>
                    <p className="task-extra">
                      Due: {task.due_date ? new Date(task.due_date).toLocaleString() : '—'}
                    </p>
                    <p className="task-extra">
                      Categories:{' '}
                      {task.categories?.length ? task.categories.map((c) => c.name).join(', ') : 'None'}
                    </p>
                    <div className="task-actions">
                      {task.status !== 'completed' && (
                        <button
                          onClick={() => handleStatusChange(task.id, 'completed')}
                          disabled={loading}
                        >
                          Mark completed
                        </button>
                      )}
                      {task.status !== 'in_progress' && (
                        <button
                          onClick={() => handleStatusChange(task.id, 'in_progress')}
                          disabled={loading}
                        >
                          In progress
                        </button>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
