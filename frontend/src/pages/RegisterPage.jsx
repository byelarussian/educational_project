import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function RegisterPage({ onRegister, loading, message, setMessage }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
  })

  function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    onRegister(formData)
  }

  return (
    <section className="auth-page">
      <h2>Регистрация</h2>
      {message && <div className="message">{message}</div>}
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Имя пользователя
          <input
            type="text"
            value={formData.username}
            onChange={(event) => setFormData({ ...formData, username: event.target.value })}
            required
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={formData.email}
            onChange={(event) => setFormData({ ...formData, email: event.target.value })}
            required
          />
        </label>
        <label>
          Имя
          <input
            type="text"
            value={formData.first_name}
            onChange={(event) => setFormData({ ...formData, first_name: event.target.value })}
            required
          />
        </label>
        <label>
          Фамилия
          <input
            type="text"
            value={formData.last_name}
            onChange={(event) => setFormData({ ...formData, last_name: event.target.value })}
            required
          />
        </label>
        <label>
          Пароль
          <input
            type="password"
            value={formData.password}
            onChange={(event) => setFormData({ ...formData, password: event.target.value })}
            required
          />
        </label>
        <button type="submit" disabled={loading}>
          Создать аккаунт
        </button>
      </form>
      <p className="form-footer">
        Уже есть аккаунт? <Link to="/login">Войти</Link>
      </p>
    </section>
  )
}
