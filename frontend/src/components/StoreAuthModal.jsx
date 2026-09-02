import { useEffect, useState } from 'react'

const emptyRegister = {
  username: '',
  email: '',
  password: '',
  password_confirm: '',
}

export default function StoreAuthModal({
  open,
  tab,
  onTabChange,
  onClose,
  onLogin,
  onRegister,
  loading,
  message,
  setMessage,
}) {
  const [loginData, setLoginData] = useState({ username: '', password: '' })
  const [registerData, setRegisterData] = useState(emptyRegister)

  useEffect(() => {
    if (!open) return undefined

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  function handleLoginSubmit(event) {
    event.preventDefault()
    setMessage?.('')
    onLogin(loginData)
  }

  function handleRegisterSubmit(event) {
    event.preventDefault()
    setMessage?.('')

    if (registerData.password.length < 8) {
      setMessage?.('Пароль должен быть не менее 8 символов')
      return
    }

    if (registerData.password !== registerData.password_confirm) {
      setMessage?.('Пароли не совпадают')
      return
    }

    onRegister(registerData)
  }

  return (
    <div className="store-auth-modal" role="dialog" aria-modal="true" aria-labelledby="store-auth-title">
      <button type="button" className="store-auth-modal__backdrop" aria-label="Закрыть" onClick={onClose} />
      <div className="store-auth-modal__panel">
        <button type="button" className="store-auth-modal__close" onClick={onClose} aria-label="Закрыть">
          ×
        </button>

        <div className="store-auth-modal__tabs">
          <button
            type="button"
            className={tab === 'login' ? 'is-active' : ''}
            onClick={() => {
              setMessage?.('')
              onTabChange('login')
            }}
          >
            Вход
          </button>
          <button
            type="button"
            className={tab === 'register' ? 'is-active' : ''}
            onClick={() => {
              setMessage?.('')
              onTabChange('register')
            }}
          >
            Регистрация
          </button>
        </div>

        <h2 id="store-auth-title">{tab === 'login' ? 'Вход' : 'Регистрация'}</h2>
        {message ? <p className="store-auth-modal__message">{message}</p> : null}

        {tab === 'login' ? (
          <form className="store-auth-modal__form" onSubmit={handleLoginSubmit}>
            <input
              type="text"
              placeholder="Логин"
              autoComplete="username"
              value={loginData.username}
              onChange={(event) => setLoginData({ ...loginData, username: event.target.value })}
              required
            />
            <input
              type="password"
              placeholder="Пароль"
              autoComplete="current-password"
              value={loginData.password}
              onChange={(event) => setLoginData({ ...loginData, password: event.target.value })}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? '…' : 'Войти'}
            </button>
          </form>
        ) : (
          <form className="store-auth-modal__form" onSubmit={handleRegisterSubmit}>
            <input
              type="text"
              placeholder="Логин"
              autoComplete="username"
              value={registerData.username}
              onChange={(event) => setRegisterData({ ...registerData, username: event.target.value })}
              required
            />
            <input
              type="email"
              placeholder="Email"
              autoComplete="email"
              value={registerData.email}
              onChange={(event) => setRegisterData({ ...registerData, email: event.target.value })}
              required
            />
            <input
              type="password"
              placeholder="Пароль"
              autoComplete="new-password"
              minLength={8}
              value={registerData.password}
              onChange={(event) => setRegisterData({ ...registerData, password: event.target.value })}
              required
            />
            <input
              type="password"
              placeholder="Повторите пароль"
              autoComplete="new-password"
              minLength={8}
              value={registerData.password_confirm}
              onChange={(event) => setRegisterData({ ...registerData, password_confirm: event.target.value })}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? '…' : 'Создать аккаунт'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
