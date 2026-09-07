import { AuthStoreShell } from './LoginPage.jsx'

/** Страница /register: витринный фон и модалка регистрации. */
export default function RegisterPage({ onLogin, onRegister, loading, message, setMessage }) {
  return (
    <AuthStoreShell
      initialTab="register"
      title="Создайте аккаунт"
      lead="Зарегистрируйтесь, чтобы оформлять заказы и отслеживать доставку бейсболок."
      onLogin={onLogin}
      onRegister={onRegister}
      loading={loading}
      message={message}
      setMessage={setMessage}
    />
  )
}
