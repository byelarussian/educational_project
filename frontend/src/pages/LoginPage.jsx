import { Link } from 'react-router-dom'
import StoreAccountMenu from '../components/StoreAccountMenu.jsx'
import '../styles/HomePage.css'

export default function LoginPage({ onLogin, onRegister, loading, message, setMessage }) {
  return (
    <div className="store-page store-auth-page">
      <header className="store-header">
        <div className="store-header__inner">
          <Link to="/" className="store-logo" aria-label="FAM.CAP">
            <span>FAM.CAP</span>
          </Link>
          <StoreAccountMenu
            startOpen
            initialTab="login"
            onLogin={onLogin}
            onRegister={onRegister}
            loading={loading}
            message={message}
            setMessage={setMessage}
          />
        </div>
      </header>
    </div>
  )
}
