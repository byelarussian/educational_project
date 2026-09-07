import { Link } from 'react-router-dom'
import StoreAccountMenu from '../components/StoreAccountMenu.jsx'
import '../styles/HomePage.css'

const AUTH_HERO_IMAGE = 'https://famshop.ru/wp-content/cache/thumb/6c/486483ccda5c46c_3840x2060.jpg'

/**
 * Общая оболочка страниц входа и регистрации в стиле витрины FAM.CAP.
 */
export function AuthStoreShell({
  initialTab,
  title,
  lead,
  onLogin,
  onRegister,
  loading,
  message,
  setMessage,
}) {
  return (
    <div className="store-page store-auth-page">
      <header className="store-header">
        <div className="store-header__inner">
          <Link to="/" className="store-logo" aria-label="FAM.CAP">
            <span>FAM.CAP</span>
          </Link>
          <nav className="store-auth-page__nav">
            <Link to="/">Магазин</Link>
            <Link to={initialTab === 'register' ? '/login' : '/register'}>
              {initialTab === 'register' ? 'Вход' : 'Регистрация'}
            </Link>
          </nav>
          <div className="store-header__actions">
            <StoreAccountMenu
              startOpen
              initialTab={initialTab}
              onLogin={onLogin}
              onRegister={onRegister}
              loading={loading}
              message={message}
              setMessage={setMessage}
            />
          </div>
        </div>
      </header>

      <section
        className="store-auth-hero"
        style={{ backgroundImage: `url(${AUTH_HERO_IMAGE})` }}
        aria-hidden="true"
      >
        <div className="store-auth-hero__veil" />
        <div className="store-auth-hero__content">
          <p className="store-auth-hero__kicker">FAM.CAP</p>
          <h1>{title}</h1>
          <p className="store-auth-hero__lead">{lead}</p>
          <Link to="/" className="store-btn store-btn--white">
            Вернуться в магазин
          </Link>
        </div>
      </section>
    </div>
  )
}

/** Страница /login: витринный фон и модалка входа. */
export default function LoginPage({ onLogin, onRegister, loading, message, setMessage }) {
  return (
    <AuthStoreShell
      initialTab="login"
      title="С возвращением"
      lead="Войдите в аккаунт, чтобы оформить заказ и следить за доставкой."
      onLogin={onLogin}
      onRegister={onRegister}
      loading={loading}
      message={message}
      setMessage={setMessage}
    />
  )
}
