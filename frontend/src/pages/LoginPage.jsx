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
      <h2>Login</h2>
      {message && <div className="message">{message}</div>}
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Username
          <input
            type="text"
            value={credentials.username}
            onChange={(event) => setCredentials({ ...credentials, username: event.target.value })}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={credentials.password}
            onChange={(event) => setCredentials({ ...credentials, password: event.target.value })}
            required
          />
        </label>
        <button type="submit" disabled={loading}>
          Sign in
        </button>
      </form>
      <p className="form-footer">
        New here? <Link to="/register">Create account</Link>
      </p>
    </section>
  )
}
