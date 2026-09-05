import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import StoreAccountMenu from '../components/StoreAccountMenu.jsx'
import {
  changePassword,
  checkoutCart,
  fetchOrders,
  removeCartItem,
  updateCartItem,
  updateMe,
} from '../api'
import '../styles/HomePage.css'
import '../styles/CabinetPage.css'

const TABS = [
  { id: 'overview', label: 'Обзор' },
  { id: 'profile', label: 'Данные' },
  { id: 'address', label: 'Адрес' },
  { id: 'orders', label: 'Заказы' },
  { id: 'cart', label: 'Корзина' },
  { id: 'password', label: 'Пароль' },
]

const ORDER_STEPS = [
  { id: 'pending', label: 'Оформлен' },
  { id: 'processing', label: 'В сборке' },
  { id: 'shipped', label: 'В пути' },
  { id: 'delivered', label: 'Доставлен' },
]

/**
 * Нормализует валюту: HTML-сущность рубля (&#8381;) превращает в символ ₽.
 */
function formatCurrency(currency) {
  if (!currency) return '₽'
  return String(currency)
    .replace(/ƃ/g, '₽')
    .replace(/&#0*8381;/g, '₽')
    .replace(/&amp;#0*8381;/g, '₽')
}

/**
 * Форматирует цену по-русски с пробелами тысяч и символом валюты. Пустое значение → 0 ₽.
 */
function formatPrice(price, currency = '₽') {
  if (price === null || price === undefined || price === '') return `0 ${formatCurrency(currency)}`
  const amount = Number(price)
  if (Number.isNaN(amount)) return `0 ${formatCurrency(currency)}`
  return `${amount.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ${formatCurrency(currency)}`
}

/** Дата заказа вида «04 сентября 2026» для списка в кабинете. */
/** Поля профиля для формы кабинета из объекта пользователя. */
function profileFromUser(user) {
  return {
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  }
}

/** Адрес доставки для формы кабинета из объекта пользователя. */
function addressFromUser(user) {
  return {
    city: user?.city || '',
    street: user?.street || '',
    apartment: user?.apartment || '',
    postal_code: user?.postal_code || '',
  }
}

/** Ключ, чтобы перезаполнить формы только когда с сервера пришли новые данные профиля. */
function userFormKey(user) {
  return [
    user?.first_name,
    user?.last_name,
    user?.email,
    user?.phone,
    user?.city,
    user?.street,
    user?.apartment,
    user?.postal_code,
  ].join('|')
}

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

/** Иконка корзины в шапке кабинета. */
function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 8h12l-1 11H7L6 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M9 8V7a3 3 0 0 1 6 0v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Шкала статусов заказа: оформлен → в сборке → в пути → доставлен.
 * Для cancelled показывает отдельную подпись вместо шкалы.
 */
function OrderTracker({ status }) {
  if (status === 'cancelled') {
    return <p className="cabinet-tracker cabinet-tracker--cancelled">Заказ отменён</p>
  }

  const currentIndex = Math.max(ORDER_STEPS.findIndex((step) => step.id === status), 0)

  return (
    <ol className="cabinet-tracker">
      {ORDER_STEPS.map((step, index) => {
        const state = index < currentIndex ? 'is-done' : index === currentIndex ? 'is-current' : ''
        return (
          <li key={step.id} className={state}>
            <span className="cabinet-tracker__dot" />
            <span>{step.label}</span>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * Личный кабинет: вкладки профиль, адрес, заказы, корзина и смена пароля.
 * Активная вкладка читается из ?tab= в URL.
 */
export default function CabinetPage({
  user,
  cart,
  loading,
  message,
  setMessage,
  onUserUpdate,
  onCartChange,
  onTokenChange,
  onLogout,
  onLogin,
  onRegister,
  isAuthenticated,
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = TABS.some((item) => item.id === searchParams.get('tab')) ? searchParams.get('tab') : 'overview'
  const [orders, setOrders] = useState([])
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [profile, setProfile] = useState(() => profileFromUser(user))
  const [address, setAddress] = useState(() => addressFromUser(user))
  const [syncedUserKey, setSyncedUserKey] = useState(() => userFormKey(user))
  const [passwords, setPasswords] = useState({
    old_password: '',
    new_password: '',
    new_password_confirm: '',
  })
  const nextUserKey = userFormKey(user)
  if (syncedUserKey !== nextUserKey) {
    setSyncedUserKey(nextUserKey)
    setProfile(profileFromUser(user))
    setAddress(addressFromUser(user))
  }

  useEffect(() => {
    let cancelled = false
    /** Загружает заказы пользователя один раз при открытии кабинета. */
    async function loadOrders() {
      try {
        const data = await fetchOrders()
        if (!cancelled) setOrders(Array.isArray(data) ? data : data.results || [])
      } catch {
        if (!cancelled) setOrders([])
      }
    }
    loadOrders()
    return () => {
      cancelled = true
    }
  }, [])

  const displayName = user?.first_name || user?.username || 'друг'
  const cartItems = cart?.items || []
  const cartCount = cart?.count || 0
  const profileFilled = [profile.first_name, profile.last_name, profile.phone, profile.email].filter(Boolean).length
  const addressFilled = Boolean(address.city && address.street && profile.phone)

  const latestOrder = orders[0]
  const activeOrders = useMemo(
    () => orders.filter((order) => !['delivered', 'cancelled'].includes(order.status)),
    [orders],
  )

  /** Переключает вкладку кабинета через search-параметр tab (обзор — без параметра). */
  function openTab(nextTab) {
    setStatus('')
    setSearchParams(nextTab === 'overview' ? {} : { tab: nextTab })
  }

  /** Сохраняет имя, фамилию, телефон и email в профиле. */
  async function handleSaveProfile(event) {
    event.preventDefault()
    setBusy(true)
    setStatus('')
    try {
      const updated = await updateMe(profile)
      onUserUpdate(updated)
      setStatus('Данные сохранены')
    } catch (error) {
      setStatus(error.data?.error || error.data?.email?.[0] || 'Не удалось сохранить данные')
    } finally {
      setBusy(false)
    }
  }

  /** Сохраняет город, улицу, квартиру и индекс — без них checkout не пройдёт. */
  async function handleSaveAddress(event) {
    event.preventDefault()
    setBusy(true)
    setStatus('')
    try {
      const updated = await updateMe(address)
      onUserUpdate(updated)
      setStatus('Адрес доставки сохранён')
    } catch (error) {
      setStatus(error.data?.error || 'Не удалось сохранить адрес')
    } finally {
      setBusy(false)
    }
  }

  /** Проверяет длину и совпадение нового пароля, затем меняет его и подставляет новый токен. */
  async function handleChangePassword(event) {
    event.preventDefault()
    setStatus('')
    if (passwords.new_password.length < 8) {
      setStatus('Новый пароль должен быть не менее 8 символов')
      return
    }
    if (passwords.new_password !== passwords.new_password_confirm) {
      setStatus('Новые пароли не совпадают')
      return
    }
    setBusy(true)
    try {
      const response = await changePassword({
        old_password: passwords.old_password,
        new_password: passwords.new_password,
      })
      if (response.token) onTokenChange(response.token)
      setPasswords({ old_password: '', new_password: '', new_password_confirm: '' })
      setStatus('Пароль обновлён')
    } catch (error) {
      setStatus(error.data?.error || 'Не удалось сменить пароль')
    } finally {
      setBusy(false)
    }
  }

  /** Меняет количество позиции корзины (кнопки +/−); меньше 1 не ставит. */
  async function handleQuantity(item, nextQuantity) {
    if (nextQuantity < 1) return
    setBusy(true)
    try {
      const nextCart = await updateCartItem(item.id, nextQuantity)
      onCartChange(nextCart)
    } catch (error) {
      setStatus(error.data?.error || 'Не удалось обновить корзину')
    } finally {
      setBusy(false)
    }
  }

  /** Удаляет позицию из корзины и обновляет счётчик в шапке. */
  async function handleRemove(item) {
    setBusy(true)
    try {
      const nextCart = await removeCartItem(item.id)
      onCartChange(nextCart)
    } catch (error) {
      setStatus(error.data?.error || 'Не удалось удалить товар')
    } finally {
      setBusy(false)
    }
  }

  /** Оформляет заказ; если нет адреса — переключает на вкладку «Адрес» и показывает ошибку API. */
  async function handleCheckout() {
    setBusy(true)
    setStatus('')
    try {
      const order = await checkoutCart()
      onCartChange({ items: [], total: '0', count: 0 })
      setOrders((current) => [order, ...current])
      openTab('orders')
      setStatus(`Заказ ${order.number} оформлен`)
    } catch (error) {
      const text = error.data?.error || 'Не удалось оформить заказ'
      setStatus(text)
      if (String(text).includes('адрес') || String(text).includes('телефон')) {
        openTab('address')
        setStatus(text)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="store-page cabinet-page">
      <header className="store-header">
        <div className="store-header__inner">
          <Link to="/" className="store-logo" aria-label="FAM.CAP">
            <span>FAM.CAP</span>
          </Link>
          <nav className="cabinet-topnav">
            <Link to="/">Магазин</Link>
            <button type="button" className={tab === 'orders' ? 'is-active' : ''} onClick={() => openTab('orders')}>
              Заказы
            </button>
            <button type="button" className={tab === 'cart' ? 'is-active' : ''} onClick={() => openTab('cart')}>
              Корзина
            </button>
          </nav>
          <div className="store-header__actions">
            <StoreAccountMenu
              isAuthenticated={isAuthenticated}
              user={user}
              onLogout={onLogout}
              onLogin={onLogin}
              onRegister={onRegister}
              loading={loading}
              message={message}
              setMessage={setMessage}
            />
            <Link to="/cabinet?tab=cart" className="store-icon-btn store-icon-btn--cart" aria-label="Корзина">
              <CartIcon />
              {cartCount ? <span className="store-cart-badge">{cartCount}</span> : null}
            </Link>
          </div>
        </div>
      </header>

      <section className="cabinet-hero">
        <div className="cabinet-hero__inner">
          <p className="cabinet-hero__kicker">Личный кабинет</p>
          <h1>Привет, {displayName}</h1>
          <p className="cabinet-hero__lead">Заказы, данные, доставка и корзина — в одном месте.</p>
        </div>
      </section>

      <div className="cabinet-shell">
        <aside className="cabinet-nav">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={tab === item.id ? 'is-active' : ''}
              onClick={() => openTab(item.id)}
            >
              {item.label}
              {item.id === 'cart' && cartCount ? <span>{cartCount}</span> : null}
              {item.id === 'orders' && activeOrders.length ? <span>{activeOrders.length}</span> : null}
            </button>
          ))}
        </aside>

        <section className="cabinet-content">
          {status ? <p className="cabinet-status">{status}</p> : null}

          {tab === 'overview' ? (
            <div className="cabinet-overview">
              <div className="cabinet-stats">
                <button type="button" className="cabinet-stat" onClick={() => openTab('orders')}>
                  <strong>{orders.length}</strong>
                  <span>заказов</span>
                </button>
                <button type="button" className="cabinet-stat" onClick={() => openTab('cart')}>
                  <strong>{cartCount}</strong>
                  <span>в корзине</span>
                </button>
                <button type="button" className="cabinet-stat" onClick={() => openTab('profile')}>
                  <strong>{profileFilled}/4</strong>
                  <span>данные</span>
                </button>
                <button type="button" className="cabinet-stat" onClick={() => openTab('address')}>
                  <strong>{addressFilled ? 'Да' : 'Нет'}</strong>
                  <span>адрес</span>
                </button>
              </div>

              <article className="cabinet-card">
                <div className="cabinet-card__head">
                  <h2>Профиль</h2>
                  <button type="button" onClick={() => openTab('profile')}>
                    Изменить
                  </button>
                </div>
                <dl className="cabinet-dl">
                  <div>
                    <dt>Имя</dt>
                    <dd>{profile.first_name || '—'}</dd>
                  </div>
                  <div>
                    <dt>Фамилия</dt>
                    <dd>{profile.last_name || '—'}</dd>
                  </div>
                  <div>
                    <dt>Телефон</dt>
                    <dd>{profile.phone || '—'}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{profile.email || '—'}</dd>
                  </div>
                </dl>
              </article>

              {latestOrder ? (
                <article className="cabinet-card">
                  <div className="cabinet-card__head">
                    <h2>Последний заказ {latestOrder.number}</h2>
                    <button type="button" onClick={() => openTab('orders')}>
                      Все заказы
                    </button>
                  </div>
                  <p className="cabinet-muted">
                    {formatDate(latestOrder.created_at)} · {formatPrice(latestOrder.total)}
                  </p>
                  <OrderTracker status={latestOrder.status} />
                </article>
              ) : (
                <article className="cabinet-empty">
                  <h2>Заказов пока нет</h2>
                  <p>Соберите первую бейсболку в корзину и оформите доставку.</p>
                  <Link to="/" className="cabinet-btn">
                    В магазин
                  </Link>
                </article>
              )}
            </div>
          ) : null}

          {tab === 'profile' ? (
            <form className="cabinet-form" onSubmit={handleSaveProfile}>
              <h2>Данные пользователя</h2>
              <label>
                Имя
                <input
                  value={profile.first_name}
                  onChange={(event) => setProfile({ ...profile, first_name: event.target.value })}
                  autoComplete="given-name"
                />
              </label>
              <label>
                Фамилия
                <input
                  value={profile.last_name}
                  onChange={(event) => setProfile({ ...profile, last_name: event.target.value })}
                  autoComplete="family-name"
                />
              </label>
              <label>
                Телефон
                <input
                  value={profile.phone}
                  onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
                  autoComplete="tel"
                  placeholder="+7 900 000-00-00"
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={profile.email}
                  onChange={(event) => setProfile({ ...profile, email: event.target.value })}
                  autoComplete="email"
                  required
                />
              </label>
              <p className="cabinet-muted">Логин: {user?.username}</p>
              <button type="submit" className="cabinet-btn" disabled={busy}>
                Сохранить данные
              </button>
            </form>
          ) : null}

          {tab === 'address' ? (
            <form className="cabinet-form" onSubmit={handleSaveAddress}>
              <h2>Адрес доставки</h2>
              <label>
                Город
                <input
                  value={address.city}
                  onChange={(event) => setAddress({ ...address, city: event.target.value })}
                  autoComplete="address-level2"
                />
              </label>
              <label>
                Улица и дом
                <input
                  value={address.street}
                  onChange={(event) => setAddress({ ...address, street: event.target.value })}
                  autoComplete="street-address"
                />
              </label>
              <div className="cabinet-form__row">
                <label>
                  Квартира
                  <input
                    value={address.apartment}
                    onChange={(event) => setAddress({ ...address, apartment: event.target.value })}
                  />
                </label>
                <label>
                  Индекс
                  <input
                    value={address.postal_code}
                    onChange={(event) => setAddress({ ...address, postal_code: event.target.value })}
                    autoComplete="postal-code"
                  />
                </label>
              </div>
              <p className="cabinet-muted">Телефон для курьера берётся из профиля: {profile.phone || 'не указан'}</p>
              <button type="submit" className="cabinet-btn" disabled={busy}>
                Сохранить адрес
              </button>
            </form>
          ) : null}

          {tab === 'orders' ? (
            <div className="cabinet-orders">
              <h2>Заказы</h2>
              {orders.length ? (
                orders.map((order) => (
                  <article key={order.id} className="cabinet-order">
                    <div className="cabinet-order__top">
                      <div>
                        <h3>{order.number}</h3>
                        <p>{formatDate(order.created_at)}</p>
                      </div>
                      <strong>{formatPrice(order.total)}</strong>
                    </div>
                    <OrderTracker status={order.status} />
                    <ul className="cabinet-order__items">
                      {order.items.map((item) => (
                        <li key={item.id}>
                          {item.image_url ? <img src={item.image_url} alt="" /> : <span className="cabinet-thumb" />}
                          <div>
                            <p>{item.title}</p>
                            <small>
                              {item.quantity} × {formatPrice(item.price, item.currency)}
                            </small>
                          </div>
                        </li>
                      ))}
                    </ul>
                    {order.address_line ? <p className="cabinet-muted">Доставка: {order.address_line}</p> : null}
                  </article>
                ))
              ) : (
                <article className="cabinet-empty">
                  <h2>Здесь появятся ваши заказы</h2>
                  <p>После оформления заказа здесь можно следить за сборкой и доставкой.</p>
                  <Link to="/" className="cabinet-btn">
                    Выбрать бейсболку
                  </Link>
                </article>
              )}
            </div>
          ) : null}

          {tab === 'cart' ? (
            <div className="cabinet-cart">
              <h2>Корзина</h2>
              {cartItems.length ? (
                <>
                  <ul className="cabinet-cart__list">
                    {cartItems.map((item) => (
                      <li key={item.id}>
                        {item.product?.image_url ? (
                          <img src={item.product.image_url} alt="" />
                        ) : (
                          <span className="cabinet-thumb" />
                        )}
                        <div className="cabinet-cart__info">
                          <p>{item.product?.title}</p>
                          <small>{formatPrice(item.product?.price, item.product?.currency)}</small>
                        </div>
                        <div className="cabinet-qty">
                          <button type="button" onClick={() => handleQuantity(item, item.quantity - 1)} disabled={busy}>
                            −
                          </button>
                          <span>{item.quantity}</span>
                          <button type="button" onClick={() => handleQuantity(item, item.quantity + 1)} disabled={busy}>
                            +
                          </button>
                        </div>
                        <strong>{formatPrice(item.line_total, item.product?.currency)}</strong>
                        <button type="button" className="cabinet-link" onClick={() => handleRemove(item)} disabled={busy}>
                          Удалить
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="cabinet-cart__footer">
                    <p>
                      Итого <strong>{formatPrice(cart.total)}</strong>
                    </p>
                    <button type="button" className="cabinet-btn" onClick={handleCheckout} disabled={busy}>
                      Оформить заказ
                    </button>
                  </div>
                </>
              ) : (
                <article className="cabinet-empty">
                  <h2>Корзина пуста</h2>
                  <p>Добавьте новинки с витрины — они появятся здесь.</p>
                  <Link to="/" className="cabinet-btn">
                    Перейти в магазин
                  </Link>
                </article>
              )}
            </div>
          ) : null}

          {tab === 'password' ? (
            <form className="cabinet-form" onSubmit={handleChangePassword}>
              <h2>Смена пароля</h2>
              <label>
                Текущий пароль
                <input
                  type="password"
                  value={passwords.old_password}
                  onChange={(event) => setPasswords({ ...passwords, old_password: event.target.value })}
                  autoComplete="current-password"
                  required
                />
              </label>
              <label>
                Новый пароль
                <input
                  type="password"
                  value={passwords.new_password}
                  onChange={(event) => setPasswords({ ...passwords, new_password: event.target.value })}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
              <label>
                Повторите новый пароль
                <input
                  type="password"
                  value={passwords.new_password_confirm}
                  onChange={(event) => setPasswords({ ...passwords, new_password_confirm: event.target.value })}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
              <button type="submit" className="cabinet-btn" disabled={busy}>
                Обновить пароль
              </button>
            </form>
          ) : null}
        </section>
      </div>
    </div>
  )
}
