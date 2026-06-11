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
      <h2>Register</h2>
      {message && <div className="message">{message}</div>}
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Username
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
          First name
          <input
            type="text"
            value={formData.first_name}
            onChange={(event) => setFormData({ ...formData, first_name: event.target.value })}
            required
          />
        </label>
        <label>
          Last name
          <input
            type="text"
            value={formData.last_name}
            onChange={(event) => setFormData({ ...formData, last_name: event.target.value })}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={formData.password}
            onChange={(event) => setFormData({ ...formData, password: event.target.value })}
            required
          />
        </label>
        <button type="submit" disabled={loading}>
          Create account
        </button>
      </form>
      <p className="form-footer">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </section>
  )
}
