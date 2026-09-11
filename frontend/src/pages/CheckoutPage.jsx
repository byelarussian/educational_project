import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import StoreProductCard from '../components/StoreProductCard.jsx'
import StorePillNav from '../components/StorePillNav.jsx'
import { fetchProducts } from '../api'
import '../styles/HomePage.css'

function formatCurrency(currency) {
  if (!currency) return '₽'
  return String(currency)
    .replace(/ƃ/g, '₽')
    .replace(/&#0*8381;/g, '₽')
    .replace(/&amp;#0*8381;/g, '₽')
}

function formatPrice(price, currency = '₽') {
  if (price === null || price === undefined || price === '') return `0 ${formatCurrency(currency)}`
  const amount = Number(price)
  if (Number.isNaN(amount)) return `0 ${formatCurrency(currency)}`
  return `${amount.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ${formatCurrency(currency)}`
}

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  city: '',
  street: '',
  apartment: '',
  postal_code: '',
  payment_method: 'on_site',
  card_number: '',
  card_holder: '',
  card_expiry: '',
  card_cvv: '',
}

const PAYMENT_OPTIONS = [
  {
    value: 'cashless',
    title: 'Безналичный расчёт',
    description: 'Оплата картой онлайн: номер, имя держателя, срок действия и код с оборота',
  },
  {
    value: 'on_site',
    title: 'Оплата на месте',
    description: 'Наличными или картой при получении в магазине на Бауманской',
  },
]

/** Форматирует номер карты группами по 4 цифры. */
function formatCardNumber(value) {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '$1 ')
    .trim()
}

/** Форматирует срок действия карты как MM/YY. */
function formatCardExpiry(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

/** Проверяет поля карты для безналичной оплаты. */
function validateCardFields(form) {
  const number = String(form.card_number || '').replace(/\D/g, '')
  const holder = String(form.card_holder || '').trim()
  const expiry = String(form.card_expiry || '').replace(/\s/g, '')
  const cvv = String(form.card_cvv || '').replace(/\D/g, '')

  if (number.length !== 16) return 'Введите 16-значный номер карты'
  if (holder.length < 3 || !holder.includes(' ')) {
    return 'Укажите имя и фамилию держателя карты латиницей'
  }
  const match = expiry.match(/^(\d{2})\/(\d{2})$/)
  if (!match) return 'Укажите срок действия карты в формате ММ/ГГ'
  const month = Number(match[1])
  if (month < 1 || month > 12) return 'Месяц срока действия карты должен быть от 01 до 12'
  if (cvv.length !== 3) return 'Введите 3 цифры кода с обратной стороны карты'
  return ''
}

/**
 * Страница оформления заказа в духе famshop.ru/checkout:
 * состав корзины, форма доставки, блок «Также покупают».
 * Оформление доступно только зарегистрированным пользователям.
 */
export default function CheckoutPage({
  cart,
  user,
  isAuthenticated = false,
  busy = false,
  message = '',
  setMessage,
  onLogin,
  onRegister,
  onLogout,
  loading = false,
  onQuantity,
  onRemove,
  onSubmitOrder,
  onAddToCart,
  onOpenCart,
}) {
  const items = cart?.items || []
  const userKey = user?.id ?? 'guest'
  const [formUserKey, setFormUserKey] = useState(userKey)
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    city: user?.city || '',
    street: user?.street || '',
    apartment: user?.apartment || '',
    postal_code: user?.postal_code || '',
  }))
  const [formError, setFormError] = useState('')
  const [needsAuth, setNeedsAuth] = useState(false)
  const [doneOrder, setDoneOrder] = useState(null)
  const [alsoBuy, setAlsoBuy] = useState([])

  if (userKey !== formUserKey) {
    setFormUserKey(userKey)
    setForm({
      ...EMPTY_FORM,
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      city: user?.city || '',
      street: user?.street || '',
      apartment: user?.apartment || '',
      postal_code: user?.postal_code || '',
    })
  }

  useEffect(() => {
    let cancelled = false
    async function loadAlsoBuy() {
      try {
        const response = await fetchProducts({ page: 1 })
        if (!cancelled) {
          setAlsoBuy((response.results || []).slice(0, 8))
        }
      } catch {
        if (!cancelled) setAlsoBuy([])
      }
    }
    loadAlsoBuy()
    return () => {
      cancelled = true
    }
  }, [])

  function updateField(field, value) {
    let nextValue = value
    if (field === 'card_number') nextValue = formatCardNumber(value)
    if (field === 'card_expiry') nextValue = formatCardExpiry(value)
    if (field === 'card_cvv') nextValue = String(value || '').replace(/\D/g, '').slice(0, 3)
    if (field === 'card_holder') nextValue = String(value || '').replace(/[^a-zA-Zа-яА-ЯёЁ\s.'-]/g, '').slice(0, 60)
    setForm((current) => ({ ...current, [field]: nextValue }))
    setFormError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!isAuthenticated) {
      setNeedsAuth(true)
      setFormError(
        'Чтобы оформить заказ, нужно войти в аккаунт или зарегистрироваться. Товары из корзины сохранятся после входа.',
      )
      return
    }
    setNeedsAuth(false)
    if (!items.length) {
      setFormError('Корзина пуста')
      return
    }
    if (!form.first_name.trim() || !form.phone.trim() || !form.city.trim() || !form.street.trim()) {
      setFormError('Заполните имя, телефон, город и улицу')
      return
    }
    if (form.payment_method === 'cashless') {
      const cardError = validateCardFields(form)
      if (cardError) {
        setFormError(cardError)
        return
      }
    }

    const payload = {
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      phone: form.phone,
      city: form.city,
      street: form.street,
      apartment: form.apartment,
      postal_code: form.postal_code,
      payment_method: form.payment_method,
    }

    const result = await onSubmitOrder?.(payload)
    if (result?.ok) {
      setDoneOrder(result.order)
      setFormError('')
      setForm((current) => ({
        ...current,
        card_number: '',
        card_holder: '',
        card_expiry: '',
        card_cvv: '',
      }))
    } else {
      setFormError(result?.message || 'Не удалось оформить заказ')
      if (result?.requireRegistration) setNeedsAuth(true)
    }
  }

  return (
    <div className="store-page checkout-page">
      <header className="store-header">
        <div className="store-header__inner">
          <Link to="/" className="store-logo" aria-label="FAM.CAP">
            <span>FAM.CAP</span>
          </Link>
          <nav className="checkout-breadcrumb" aria-label="Навигация">
            <Link to="/">Главная</Link>
            <span>/</span>
            <span>Корзина</span>
          </nav>
          <div className="store-header__actions">
            <StorePillNav
              cartCount={cart?.count || 0}
              onSearch={() => {
                window.location.href = '/#catalog'
              }}
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

      <main className="checkout-main">
        <h1>Корзина</h1>

        {doneOrder ? (
          <section className="checkout-success">
            <h2>Заказ оформлен</h2>
            <p>
              Номер заказа <strong>{doneOrder.number}</strong>. Мы свяжемся с вами по телефону{' '}
              {doneOrder.phone}.
            </p>
            {doneOrder.payment_label ? (
              <p className="checkout-success__payment">Способ оплаты: {doneOrder.payment_label}</p>
            ) : null}
            <Link to="/" className="checkout-btn">
              Вернуться в магазин
            </Link>
          </section>
        ) : null}

        {!doneOrder && !items.length ? (
          <section className="checkout-empty">
            <p>Вы пока что еще ничего не добавили в корзину</p>
            <Link to="/" className="checkout-btn checkout-btn--outline">
              Вернуться в магазин
            </Link>
          </section>
        ) : null}

        {!doneOrder && items.length ? (
          <div className="checkout-layout">
            <section className="checkout-cart">
              <ul className="checkout-cart__list">
                {items.map((item) => (
                  <li key={item.id}>
                    {item.product?.image_url ? (
                      <img src={item.product.image_url} alt="" />
                    ) : (
                      <span className="checkout-cart__thumb" />
                    )}
                    <div className="checkout-cart__info">
                      <p>{item.product?.title}</p>
                      {item.size ? <small>Размер: {item.size}</small> : null}
                      <strong>{formatPrice(item.product?.price, item.product?.currency)}</strong>
                    </div>
                    <div className="checkout-cart__qty">
                      <button
                        type="button"
                        onClick={() => onQuantity?.(item, item.quantity - 1)}
                        disabled={busy || item.quantity <= 1}
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button type="button" onClick={() => onQuantity?.(item, item.quantity + 1)} disabled={busy}>
                        +
                      </button>
                    </div>
                    <strong className="checkout-cart__line">{formatPrice(item.line_total, item.product?.currency)}</strong>
                    <button type="button" className="checkout-cart__remove" onClick={() => onRemove?.(item)} disabled={busy}>
                      Удалить
                    </button>
                  </li>
                ))}
              </ul>

              <div className="checkout-summary">
                <span>Итого</span>
                <strong>{formatPrice(cart.total)}</strong>
              </div>
            </section>

            <form className="checkout-form" onSubmit={handleSubmit}>
              <h2>Оформление заказа</h2>
              <p className="checkout-form__hint">
                {isAuthenticated
                  ? 'Укажите контакты и адрес доставки для оформления заказа.'
                  : 'Укажите контакты и адрес доставки. Для подтверждения заказа потребуется вход или регистрация.'}
              </p>

              <div className="checkout-form__grid">
                <label>
                  Имя *
                  <input
                    value={form.first_name}
                    onChange={(event) => updateField('first_name', event.target.value)}
                    autoComplete="given-name"
                    required
                  />
                </label>
                <label>
                  Фамилия
                  <input
                    value={form.last_name}
                    onChange={(event) => updateField('last_name', event.target.value)}
                    autoComplete="family-name"
                  />
                </label>
                <label>
                  Телефон *
                  <input
                    value={form.phone}
                    onChange={(event) => updateField('phone', event.target.value)}
                    autoComplete="tel"
                    required
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField('email', event.target.value)}
                    autoComplete="email"
                  />
                </label>
                <label>
                  Город *
                  <input
                    value={form.city}
                    onChange={(event) => updateField('city', event.target.value)}
                    autoComplete="address-level2"
                    required
                  />
                </label>
                <label>
                  Индекс
                  <input
                    value={form.postal_code}
                    onChange={(event) => updateField('postal_code', event.target.value)}
                    autoComplete="postal-code"
                  />
                </label>
                <label className="checkout-form__full">
                  Улица, дом *
                  <input
                    value={form.street}
                    onChange={(event) => updateField('street', event.target.value)}
                    autoComplete="street-address"
                    required
                  />
                </label>
                <label>
                  Квартира
                  <input
                    value={form.apartment}
                    onChange={(event) => updateField('apartment', event.target.value)}
                  />
                </label>
              </div>

              <fieldset className="checkout-payment">
                <legend>Способ оплаты</legend>
                <div className="checkout-payment__options">
                  {PAYMENT_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={`checkout-payment__option ${form.payment_method === option.value ? 'is-active' : ''}`}
                    >
                      <input
                        type="radio"
                        name="payment_method"
                        value={option.value}
                        checked={form.payment_method === option.value}
                        onChange={() => updateField('payment_method', option.value)}
                      />
                      <span>
                        <strong>{option.title}</strong>
                        <small>{option.description}</small>
                      </span>
                    </label>
                  ))}
                </div>

                {form.payment_method === 'cashless' ? (
                  <div className="checkout-card-panel" role="group" aria-label="Данные банковской карты">
                    <h3>Данные карты</h3>
                    <p className="checkout-card-panel__hint">
                      Заполните поля для безналичной оплаты. Данные карты не сохраняются после оформления.
                    </p>
                    <div className="checkout-form__grid">
                      <label className="checkout-form__full">
                        Номер карты *
                        <input
                          value={form.card_number}
                          onChange={(event) => updateField('card_number', event.target.value)}
                          inputMode="numeric"
                          autoComplete="cc-number"
                          placeholder="0000 0000 0000 0000"
                          required={form.payment_method === 'cashless'}
                        />
                      </label>
                      <label className="checkout-form__full">
                        Имя и фамилия держателя *
                        <input
                          value={form.card_holder}
                          onChange={(event) => updateField('card_holder', event.target.value)}
                          autoComplete="cc-name"
                          placeholder="IVAN IVANOV"
                          required={form.payment_method === 'cashless'}
                        />
                      </label>
                      <label>
                        Срок действия *
                        <input
                          value={form.card_expiry}
                          onChange={(event) => updateField('card_expiry', event.target.value)}
                          inputMode="numeric"
                          autoComplete="cc-exp"
                          placeholder="ММ/ГГ"
                          required={form.payment_method === 'cashless'}
                        />
                      </label>
                      <label>
                        Код с оборота (CVV) *
                        <input
                          value={form.card_cvv}
                          onChange={(event) => updateField('card_cvv', event.target.value)}
                          inputMode="numeric"
                          autoComplete="cc-csc"
                          placeholder="000"
                          required={form.payment_method === 'cashless'}
                        />
                      </label>
                    </div>
                  </div>
                ) : null}
              </fieldset>

              {(formError || message) && <p className="checkout-form__error">{formError || message}</p>}

              <button type="submit" className="checkout-btn" disabled={busy}>
                {busy ? 'Оформляем…' : 'Подтвердить заказ'}
              </button>

              {!isAuthenticated && needsAuth ? (
                <div className="checkout-form__auth-actions" role="status">
                  <Link to="/login" className="checkout-btn">
                    Войти в аккаунт
                  </Link>
                  <Link to="/register" className="checkout-btn checkout-btn--outline">
                    Зарегистрироваться
                  </Link>
                </div>
              ) : null}
            </form>
          </div>
        ) : null}

        {alsoBuy.length ? (
          <section className="checkout-also">
            <h2>Также покупают</h2>
            <div className="store-rail__grid">
              {alsoBuy.map((product) => (
                <StoreProductCard key={product.id} product={product} onAddToCart={onAddToCart} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  )
}
