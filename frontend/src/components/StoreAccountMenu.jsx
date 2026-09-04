import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import StoreAuthModal from './StoreAuthModal.jsx'

/** SVG-иконка силуэта пользователя на кнопке входа в шапке. */
function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.2 19.2c1.5-3.1 3.9-4.7 6.8-4.7s5.3 1.6 6.8 4.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Меню аккаунта в шапке магазина.
 * Гость: иконка открывает модалку входа/регистрации.
 * Авторизованный: аватар с выпадающим списком «Кабинет» и «Выйти».
 */
export default function StoreAccountMenu({
  isAuthenticated,
  user,
  onLogout,
  onLogin,
  onRegister,
  loading,
  message,
  setMessage,
  initialTab = 'login',
  startOpen = false,
}) {
  const [open, setOpen] = useState(Boolean(startOpen) && !isAuthenticated)
  const [tab, setTab] = useState(initialTab)
  const rootRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    /** Закрывает выпадающее меню, если клик был снаружи блока аккаунта. */
    function handlePointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  if (isAuthenticated) {
    return (
      <div className={`store-account${open ? ' is-open' : ''}`} ref={rootRef}>
        <button
          type="button"
          className="store-icon-btn"
          aria-label={user?.username || 'Аккаунт'}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="store-account__avatar">{user?.username?.[0]?.toUpperCase() || 'A'}</span>
        </button>
        {open ? (
          <div className="store-account__dropdown" role="menu">
            <Link to="/cabinet" role="menuitem" onClick={() => setOpen(false)}>
              Кабинет
            </Link>
            <button type="button" role="menuitem" onClick={onLogout}>
              Выйти
            </button>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        className="store-icon-btn"
        aria-label="Вход и регистрация"
        onClick={() => {
          setTab(initialTab)
          setMessage?.('')
          setOpen(true)
        }}
      >
        <UserIcon />
      </button>
      <StoreAuthModal
        open={open}
        tab={tab}
        onTabChange={setTab}
        onClose={() => {
          setOpen(false)
          if (location.pathname === '/login' || location.pathname === '/register') {
            navigate('/')
          }
        }}
        onLogin={onLogin}
        onRegister={onRegister}
        loading={loading}
        message={message}
        setMessage={setMessage}
      />
    </>
  )
}
