import { Link } from 'react-router-dom'
import StoreAccountMenu from './StoreAccountMenu.jsx'

function IconHome() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4.5 10.5 12 4l7.5 6.5V20a1 1 0 0 1-1 1h-4.2v-5.2h-4.6V21H5.5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16.2 16.4 20 20.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function IconBag() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7.2 8.2h9.6l-.7 11.2H7.9L7.2 8.2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M9.2 8.2V7a2.8 2.8 0 0 1 5.6 0v1.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Белый овал быстрых действий в шапке:
 * домой, поиск, кабинет, корзина.
 */
export default function StorePillNav({
  cartCount = 0,
  onSearch,
  onOpenCart,
  isAuthenticated,
  user,
  onLogout,
  onLogin,
  onRegister,
  loading,
  message,
  setMessage,
  hideHome = false,
}) {
  return (
    <nav className="store-pill-nav" aria-label="Быстрые действия">
      {hideHome ? null : (
        <Link to="/" className="store-pill-nav__item" aria-label="Домой">
          <IconHome />
          <span>Домой</span>
        </Link>
      )}

      <button type="button" className="store-pill-nav__item" onClick={onSearch} aria-label="Поиск">
        <IconSearch />
        <span>Поиск</span>
      </button>

      <StoreAccountMenu
        variant="pill"
        isAuthenticated={isAuthenticated}
        user={user}
        onLogout={onLogout}
        onLogin={onLogin}
        onRegister={onRegister}
        loading={loading}
        message={message}
        setMessage={setMessage}
      />

      <button
        type="button"
        className="store-pill-nav__item store-pill-nav__item--cart"
        onClick={onOpenCart}
        aria-label="Корзина"
      >
        <IconBag />
        <span>Корзина</span>
        {cartCount ? <i className="store-pill-nav__badge">{cartCount}</i> : null}
      </button>
    </nav>
  )
}
