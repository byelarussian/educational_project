import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import StorePillNav from '../components/StorePillNav.jsx'
import SizeSelectModal from '../components/SizeSelectModal.jsx'
import {
  addToCart,
  changePassword,
  checkoutCart,
  fetchDeferred,
  fetchOrders,
  addToDeferred,
  moveDeferredToCart,
  removeCartItem,
  removeDeferredItem,
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
  { id: 'tracking', label: 'Отслеживание' },
  { id: 'cart', label: 'Корзина' },
  { id: 'deferred', label: 'Отложенные' },
  { id: 'password', label: 'Пароль' },
]

/** Атмосфера кабинета: мужские бейсболки с прямым козырьком (визуальный ряд как на Pinterest / FAM.CAP). */
const CABINET_MOOD = {
  hero: 'https://famshop.ru/wp-content/cache/thumb/6c/486483ccda5c46c_3840x2060.jpg',
  strip: [
    {
      src: 'https://famshop.ru/wp-content/cache/thumb/6e/aac224fdbce586e_370x180.jpg',
      label: 'New Era',
    },
    {
      src: 'https://famshop.ru/wp-content/cache/thumb/b7/cd63c77a08405b7_370x180.jpg',
      label: 'Kangol',
    },
    {
      src: 'https://famshop.ru/wp-content/cache/thumb/87/8af6e536489a887_370x180.jpg',
      label: 'FAM.CAP',
    },
    {
      src: 'https://famshop.ru/wp-content/cache/thumb/eb/114b8ca6280d5eb_370x180.jpg',
      label: "'47",
    },
    {
      src: 'https://famshop.ru/wp-content/cache/thumb/c2/8a758b4e935b9c2_370x180.jpg',
      label: 'Сетка',
    },
    {
      src: 'https://famshop.ru/wp-content/cache/thumb/d8/19672f95c5c1dd8_670x730.png',
      label: 'Fitted',
    },
  ],
}

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

/**
 * Подпись статуса заказа для бейджа во вкладке «Отслеживание».
 */
function orderStatusLabel(status) {
  if (status === 'cancelled') return 'Отменён'
  return ORDER_STEPS.find((step) => step.id === status)?.label || 'Оформлен'
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
 * Личный кабинет: вкладки профиль, адрес, заказы, отслеживание, корзина, отложенные и смена пароля.
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
  onOpenCart,
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const tab = TABS.some((item) => item.id === searchParams.get('tab')) ? searchParams.get('tab') : 'overview'
  const [orders, setOrders] = useState([])
  const [deferred, setDeferred] = useState({ items: [], count: 0 })
  const [sizePickItem, setSizePickItem] = useState(null)
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
    /** Загружает заказы и отложенные при открытии кабинета. */
    async function loadCabinetData() {
      try {
        const [ordersData, deferredData] = await Promise.all([fetchOrders(), fetchDeferred()])
        if (!cancelled) {
          setOrders(Array.isArray(ordersData) ? ordersData : ordersData.results || [])
          setDeferred({
            items: deferredData?.items || [],
            count: deferredData?.count || 0,
          })
        }
      } catch {
        if (!cancelled) {
          setOrders([])
          setDeferred({ items: [], count: 0 })
        }
      }
    }
    loadCabinetData()
    return () => {
      cancelled = true
    }
  }, [])

  const displayName = user?.first_name || user?.username || 'друг'
  const cartItems = cart?.items || []
  const cartCount = cart?.count || 0
  const deferredItems = deferred?.items || []
  const deferredCount = deferred?.count || deferredItems.length

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

  /** Переносит позицию из корзины в отложенные. */
  async function handleDeferCartItem(item) {
    if (!item?.product?.id || !item.size) {
      setStatus('Не удалось отложить: укажите размер товара')
      return
    }
    setBusy(true)
    setStatus('')
    try {
      const nextDeferred = await addToDeferred({
        product_id: item.product.id,
        size: item.size,
        quantity: item.quantity || 1,
      })
      const nextCart = await removeCartItem(item.id)
      setDeferred({
        items: nextDeferred?.items || [],
        count: nextDeferred?.count || 0,
      })
      onCartChange(nextCart)
      setStatus('Товар перенесён в отложенные')
    } catch (error) {
      setStatus(error.data?.error || 'Не удалось отложить товар')
    } finally {
      setBusy(false)
    }
  }

  /** Удаляет позицию из отложенных. */
  async function handleRemoveDeferred(item) {
    setBusy(true)
    setStatus('')
    try {
      const nextDeferred = await removeDeferredItem(item.id)
      setDeferred({
        items: nextDeferred?.items || [],
        count: nextDeferred?.count || 0,
      })
    } catch (error) {
      setStatus(error.data?.error || 'Не удалось удалить из отложенных')
    } finally {
      setBusy(false)
    }
  }

  /** Переносит отложенный товар в корзину (если нет размера — сначала выбор размера). */
  async function handleMoveDeferredToCart(item) {
    if (!item.size) {
      setSizePickItem(item)
      return
    }
    setBusy(true)
    setStatus('')
    try {
      const response = await moveDeferredToCart(item.id)
      setDeferred({
        items: response?.deferred?.items || [],
        count: response?.deferred?.count || 0,
      })
      if (response?.cart) onCartChange(response.cart)
      setStatus('Товар добавлен в корзину')
    } catch (error) {
      setStatus(error.data?.error || 'Не удалось перенести в корзину')
    } finally {
      setBusy(false)
    }
  }

  /** После выбора размера: в корзину и удаление из отложенных. */
  async function handleDeferredSizeConfirm(size) {
    if (!sizePickItem?.product?.id) return
    setBusy(true)
    setStatus('')
    try {
      const nextCart = await addToCart({
        product_id: sizePickItem.product.id,
        size,
        quantity: sizePickItem.quantity || 1,
      })
      const nextDeferred = await removeDeferredItem(sizePickItem.id)
      onCartChange(nextCart)
      setDeferred({
        items: nextDeferred?.items || [],
        count: nextDeferred?.count || 0,
      })
      setSizePickItem(null)
      setStatus('Товар добавлен в корзину')
    } catch (error) {
      setStatus(error.data?.error || 'Не удалось перенести в корзину')
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
            <button type="button" className={tab === 'tracking' ? 'is-active' : ''} onClick={() => openTab('tracking')}>
              Отслеживание
            </button>
            <button
              type="button"
              className={tab === 'cart' ? 'is-active' : ''}
              onClick={() => {
                onOpenCart?.()
                openTab('cart')
              }}
            >
              Корзина
            </button>
            <button
              type="button"
              className={tab === 'deferred' ? 'is-active' : ''}
              onClick={() => openTab('deferred')}
            >
              Отложенные
              {deferredCount ? <span className="cabinet-topnav__count">{deferredCount}</span> : null}
            </button>
          </nav>
          <div className="store-header__actions">
            <StorePillNav
              hideHome={false}
              cartCount={cartCount}
              onSearch={() => navigate('/')}
              onOpenCart={() => onOpenCart?.()}
              isAuthenticated={isAuthenticated}
              user={user}
              onLogout={onLogout}
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
        className="cabinet-hero"
        style={{ backgroundImage: `url(${CABINET_MOOD.hero})` }}
      >
        <div className="cabinet-hero__veil" aria-hidden="true" />
        <div className="cabinet-hero__inner">
          <p className="cabinet-hero__kicker">Личный кабинет</p>
          <h1>Привет, {displayName}</h1>
          <p className="cabinet-hero__lead">Заказы, отслеживание, корзина и отложенные — в одном месте.</p>
        </div>
      </section>

      <div className="cabinet-shell">
        <aside className="cabinet-nav">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={tab === item.id ? 'is-active' : ''}
              onClick={() => {
                if (item.id === 'cart') {
                  onOpenCart?.()
                }
                openTab(item.id)
              }}
            >
              {item.label}
              {item.id === 'cart' && cartCount ? <span>{cartCount}</span> : null}
              {item.id === 'deferred' && deferredCount ? <span>{deferredCount}</span> : null}
              {item.id === 'orders' && activeOrders.length ? <span>{activeOrders.length}</span> : null}
              {item.id === 'tracking' && activeOrders.length ? <span>{activeOrders.length}</span> : null}
            </button>
          ))}
        </aside>

        <section className="cabinet-content">
          {status ? <p className="cabinet-status">{status}</p> : null}

          {tab === 'overview' ? (
            <div className="cabinet-overview">
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
                    <button type="button" onClick={() => openTab('tracking')}>
                      Отследить
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
                              {item.size ? `Размер ${item.size} · ` : ''}
                              {item.quantity} × {formatPrice(item.price, item.currency)}
                            </small>
                          </div>
                        </li>
                      ))}
                    </ul>
                    {order.address_line ? <p className="cabinet-muted">Доставка: {order.address_line}</p> : null}
                    {order.payment_label ? <p className="cabinet-muted">Оплата: {order.payment_label}</p> : null}
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

          {tab === 'tracking' ? (
            <div className="cabinet-tracking">
              <h2>Отслеживание заказов</h2>
              <p className="cabinet-muted cabinet-tracking__lead">
                Статус сборки и доставки по каждому заказу. Активных сейчас: {activeOrders.length}.
              </p>
              {orders.length ? (
                orders.map((order) => (
                  <article key={order.id} className="cabinet-order cabinet-tracking__card">
                    <div className="cabinet-order__top">
                      <div>
                        <h3>{order.number}</h3>
                        <p>{formatDate(order.created_at)}</p>
                      </div>
                      <span className={`cabinet-tracking__badge cabinet-tracking__badge--${order.status}`}>
                        {orderStatusLabel(order.status)}
                      </span>
                    </div>
                    <OrderTracker status={order.status} />
                    <dl className="cabinet-dl cabinet-tracking__meta">
                      <div>
                        <dt>Сумма</dt>
                        <dd>{formatPrice(order.total)}</dd>
                      </div>
                      <div>
                        <dt>Оплата</dt>
                        <dd>{order.payment_label || '—'}</dd>
                      </div>
                      <div>
                        <dt>Доставка</dt>
                        <dd>{order.address_line || 'Адрес не указан'}</dd>
                      </div>
                      <div>
                        <dt>Телефон</dt>
                        <dd>{order.phone || profile.phone || '—'}</dd>
                      </div>
                    </dl>
                    {order.items?.length ? (
                      <ul className="cabinet-order__items">
                        {order.items.map((item) => (
                          <li key={item.id}>
                            {item.image_url ? <img src={item.image_url} alt="" /> : <span className="cabinet-thumb" />}
                            <div>
                              <p>{item.title}</p>
                              <small>
                                {item.size ? `Размер ${item.size} · ` : ''}
                                {item.quantity} шт.
                              </small>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                ))
              ) : (
                <article className="cabinet-empty">
                  <h2>Пока нечего отслеживать</h2>
                  <p>Оформите заказ — здесь появится шкала статуса доставки.</p>
                  <Link to="/" className="cabinet-btn">
                    В магазин
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
                      <li key={item.id} className="cabinet-cart__card">
                        {item.product?.image_url ? (
                          <img src={item.product.image_url} alt="" />
                        ) : (
                          <span className="cabinet-thumb" />
                        )}
                        <div className="cabinet-cart__info">
                          <p>{item.product?.title}</p>
                          {item.size ? <small>Размер: {item.size}</small> : null}
                          <small>{formatPrice(item.product?.price, item.product?.currency)}</small>
                          <div className="cabinet-cart__controls">
                            <div className="cabinet-qty" aria-label="Количество товара">
                              <button
                                type="button"
                                onClick={() => handleQuantity(item, item.quantity - 1)}
                                disabled={busy || item.quantity <= 1}
                                aria-label="Уменьшить количество"
                              >
                                −
                              </button>
                              <span>{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => handleQuantity(item, item.quantity + 1)}
                                disabled={busy}
                                aria-label="Увеличить количество"
                              >
                                +
                              </button>
                            </div>
                            <strong>{formatPrice(item.line_total, item.product?.currency)}</strong>
                            <button
                              type="button"
                              className="cabinet-link"
                              onClick={() => handleDeferCartItem(item)}
                              disabled={busy}
                            >
                              Отложить
                            </button>
                            <button
                              type="button"
                              className="cabinet-link"
                              onClick={() => handleRemove(item)}
                              disabled={busy}
                            >
                              Удалить
                            </button>
                          </div>
                        </div>
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

          {tab === 'deferred' ? (
            <div className="cabinet-cart cabinet-deferred">
              <h2>Отложенные</h2>
              {deferredItems.length ? (
                <ul className="cabinet-cart__list">
                  {deferredItems.map((item) => (
                    <li key={item.id} className="cabinet-cart__card">
                      {item.product?.image_url ? (
                        <img src={item.product.image_url} alt="" />
                      ) : (
                        <span className="cabinet-thumb" />
                      )}
                      <div className="cabinet-cart__info">
                        <p>{item.product?.title}</p>
                        {item.size ? <small>Размер: {item.size}</small> : null}
                        <small>
                          {item.quantity > 1 ? `${item.quantity} × ` : ''}
                          {formatPrice(item.product?.price, item.product?.currency)}
                        </small>
                        <div className="cabinet-cart__controls">
                          <strong>{formatPrice(item.line_total, item.product?.currency)}</strong>
                          <button
                            type="button"
                            className="cabinet-btn cabinet-btn--compact"
                            onClick={() => handleMoveDeferredToCart(item)}
                            disabled={busy}
                          >
                            В корзину
                          </button>
                          <button
                            type="button"
                            className="cabinet-link"
                            onClick={() => handleRemoveDeferred(item)}
                            disabled={busy}
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <article className="cabinet-empty">
                  <h2>Пока пусто</h2>
                  <p>Нажмите сердечко на карточке товара в магазине — он появится здесь.</p>
                  <Link to="/" className="cabinet-btn cabinet-btn--outline">
                    В магазин
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

      <section className="cabinet-mood" aria-label="Бейсболки с прямым козырьком">
        <div className="cabinet-mood__inner">
          <div className="cabinet-mood__copy">
            <p className="cabinet-mood__kicker">Flat brim</p>
            <h2>Мужские бейсболки с прямым козырьком</h2>
            <p>Атмосфера кабинета — в духе подборок fitted и snapback с прямым козырьком.</p>
            <a
              className="cabinet-mood__link"
              href="https://ru.pinterest.com/search/pins/?q=%D0%B1%D0%B5%D0%B9%D1%81%D0%B1%D0%BE%D0%BB%D0%BA%D0%B8%20%D0%BC%D1%83%D0%B6%D1%81%D0%BA%D0%B8%D0%B5%20%D1%81%20%D0%BF%D1%80%D1%8F%D0%BC%D1%8B%D0%BC%20%D0%BA%D0%BE%D0%B7%D1%8B%D1%80%D1%8C%D0%BA%D0%BE%D0%BC&rs=typed"
              target="_blank"
              rel="noreferrer"
            >
              Смотреть вдохновение
            </a>
          </div>
          <div className="cabinet-mood__strip">
            {CABINET_MOOD.strip.map((item) => (
              <figure key={item.label} className="cabinet-mood__shot">
                <img src={item.src} alt={item.label} loading="lazy" />
                <figcaption>{item.label}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <SizeSelectModal
        open={Boolean(sizePickItem)}
        product={sizePickItem?.product}
        onClose={() => setSizePickItem(null)}
        onConfirm={handleDeferredSizeConfirm}
      />
    </div>
  )
}
