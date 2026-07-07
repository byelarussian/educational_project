import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function LoginPage({ onLogin, loading, message, setMessage }) {
  const [credentials, setCredentials] = useState({ username: '', password: '' })

  function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    onLogin(credentials)
  }

  return (
    <section className="auth-page">
      <h2>Вход</h2>
      {message && <div className="message">{message}</div>}
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Имя пользователя
          <input
            type="text"
            value={credentials.username}
            onChange={(event) => setCredentials({ ...credentials, username: event.target.value })}
            required
          />
        </label>
        <label>
          Пароль
          <input
            type="password"
            value={credentials.password}
            onChange={(event) => setCredentials({ ...credentials, password: event.target.value })}
            required
          />
        </label>
        <button type="submit" disabled={loading}>
          Войти
        </button>
      </form>
      <p className="form-footer">
        Новичок? <Link to="/register">Создать аккаунт</Link>
      </p>
    </section>
  )
}
