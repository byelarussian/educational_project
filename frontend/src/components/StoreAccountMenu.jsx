import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import StoreAuthModal from './StoreAuthModal.jsx'

function PillUserIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M5 19.2c1.4-3 3.7-4.5 7-4.5s5.6 1.5 7 4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

/**
 * Меню аккаунта в шапке магазина.
 * variant="pill" — пункт белого овала с подписью «Кабинет».
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
  variant = 'default',
}) {
  const [open, setOpen] = useState(Boolean(startOpen) && !isAuthenticated)
  const [tab, setTab] = useState(initialTab)
  const rootRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()
  const isPill = variant === 'pill'

  useEffect(() => {
    function handlePointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const triggerClass = isPill ? 'store-pill-nav__item' : 'store-icon-btn'

  if (isAuthenticated) {
    return (
      <div className={`store-account${open ? ' is-open' : ''}${isPill ? ' store-account--pill' : ''}`} ref={rootRef}>
        <button
          type="button"
          className={triggerClass}
          aria-label={user?.username || 'Аккаунт'}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <PillUserIcon />
          {isPill ? <span>Кабинет</span> : null}
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
    <div className={`store-account${isPill ? ' store-account--pill' : ''}`} ref={rootRef}>
      <button
        type="button"
        className={triggerClass}
        aria-label="Вход и регистрация"
        onClick={() => {
          setTab(initialTab)
          setMessage?.('')
          setOpen(true)
        }}
      >
        <PillUserIcon />
        {isPill ? <span>Кабинет</span> : null}
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
    </div>
  )
}
