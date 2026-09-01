import { useState } from 'react'
import '../styles/HomePage.css'

export default function HomePage({ onLogin, onRegister, loading, message, setMessage }) {
  const [activeTab, setActiveTab] = useState('login')
  const [loginData, setLoginData] = useState({ username: '', password: '' })
  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
  })

  const handleLoginSubmit = (e) => {
    e.preventDefault()
    setMessage('')
    if (!loginData.username || !loginData.password) {
      setMessage('Пожалуйста, заполните все поля')
      return
    }
    onLogin(loginData)
  }

  const handleRegisterSubmit = (e) => {
    e.preventDefault()
    setMessage('')

    if (
      !registerData.username ||
      !registerData.email ||
      !registerData.password ||
      !registerData.password_confirm ||
      !registerData.first_name ||
      !registerData.last_name
    ) {
      setMessage('Пожалуйста, заполните все поля')
      return
    }

    if (registerData.password !== registerData.password_confirm) {
      setMessage('Пароли не совпадают')
      return
    }

    if (registerData.password.length < 8) {
      setMessage('Пароль должен быть не менее 8 символов')
      return
    }

    onRegister(registerData)
  }

  return (
    <div className="home-page">
      <div className="home-container">
        <div className="home-hero">
          <h1>Менеджер Задач</h1>
          <p>Управляйте своими задачами, категориями и товарами в одном месте</p>
        </div>

        <div className="auth-container">
          <div className="auth-tabs">
            <button
              className={`tab-button ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('login')
                setMessage('')
              }}
            >
              Вход
            </button>
            <button
              className={`tab-button ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('register')
                setMessage('')
              }}
            >
              Регистрация
            </button>
          </div>

          {message && <div className="message message-error">{message}</div>}

          {activeTab === 'login' && (
            <form className="auth-form" onSubmit={handleLoginSubmit}>
              <h2>Вход в аккаунт</h2>
              <div className="form-group">
                <label htmlFor="login-username">Имя пользователя</label>
                <input
                  id="login-username"
                  type="text"
                  placeholder="Введите имя пользователя"
                  value={loginData.username}
                  onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="login-password">Пароль</label>
                <input
                  id="login-password"
                  type="password"
                  placeholder="Введите пароль"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  required
                />
              </div>
              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? 'Загрузка...' : 'Войти'}
              </button>
            </form>
          )}

          {activeTab === 'register' && (
            <form className="auth-form" onSubmit={handleRegisterSubmit}>
              <h2>Создать новый аккаунт</h2>
              <div className="form-group">
                <label htmlFor="register-username">Имя пользователя</label>
                <input
                  id="register-username"
                  type="text"
                  placeholder="Выберите имя пользователя"
                  value={registerData.username}
                  onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="register-email">Электронная почта</label>
                <input
                  id="register-email"
                  type="email"
                  placeholder="Введите email"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="register-firstname">Имя</label>
                <input
                  id="register-firstname"
                  type="text"
                  placeholder="Ваше имя"
                  value={registerData.first_name}
                  onChange={(e) => setRegisterData({ ...registerData, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="register-lastname">Фамилия</label>
                <input
                  id="register-lastname"
                  type="text"
                  placeholder="Ваша фамилия"
                  value={registerData.last_name}
                  onChange={(e) => setRegisterData({ ...registerData, last_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="register-password">Пароль</label>
                <input
                  id="register-password"
                  type="password"
                  placeholder="Минимум 8 символов"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="register-password-confirm">Подтвердите пароль</label>
                <input
                  id="register-password-confirm"
                  type="password"
                  placeholder="Повторите пароль"
                  value={registerData.password_confirm}
                  onChange={(e) =>
                    setRegisterData({ ...registerData, password_confirm: e.target.value })
                  }
                  required
                />
              </div>
              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? 'Загрузка...' : 'Создать аккаунт'}
              </button>
            </form>
          )}
        </div>

        <div className="home-features">
          <div className="feature">
            <h3>📋 Управление задачами</h3>
            <p>Создавайте, редактируйте и отслеживайте свои задачи</p>
          </div>
          <div className="feature">
            <h3>📁 Категории</h3>
            <p>Организуйте задачи по категориям с пользовательскими цветами</p>
          </div>
          <div className="feature">
            <h3>🛍️ Товары</h3>
            <p>Ведите список товаров и управляйте инвентарем</p>
          </div>
        </div>
      </div>
    </div>
  )
}
