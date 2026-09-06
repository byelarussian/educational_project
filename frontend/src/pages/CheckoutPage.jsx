import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import StoreProductCard from '../components/StoreProductCard.jsx'
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
}

const PAYMENT_OPTIONS = [
  {
    value: 'cashless',
    title: 'Безналичный расчёт',
    description: 'Оплата по реквизитам или переводом после подтверждения заказа',
  },
  {
    value: 'on_site',
    title: 'Оплата на месте',
    description: 'Наличными или картой при получении в магазине на Бауманской',
  },
]

/**
 * Страница оформления заказа в духе famshop.ru/checkout:
 * состав корзины, форма доставки, блок «Также покупают».
 * Регистрация не обязательна.
 */
export default function CheckoutPage({
  cart,
  user,
  busy = false,
  message = '',
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
    setForm((current) => ({ ...current, [field]: value }))
    setFormError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!items.length) {
      setFormError('Корзина пуста')
      return
    }
    if (!form.first_name.trim() || !form.phone.trim() || !form.city.trim() || !form.street.trim()) {
      setFormError('Заполните имя, телефон, город и улицу')
      return
    }

    const result = await onSubmitOrder?.(form)
    if (result?.ok) {
      setDoneOrder(result.order)
      setFormError('')
    } else {
      setFormError(result?.message || 'Не удалось оформить заказ')
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
          <button type="button" className="store-icon-btn store-icon-btn--cart" onClick={() => onOpenCart?.()} aria-label="Корзина">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 8h12l-1 11H7L6 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M9 8V7a3 3 0 0 1 6 0v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {cart?.count ? <span className="store-cart-badge">{cart.count}</span> : null}
          </button>
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
              <p className="checkout-form__hint">Можно оформить без регистрации — укажите контакты и адрес доставки.</p>

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
              </fieldset>

              {(formError || message) && <p className="checkout-form__error">{formError || message}</p>}

              <button type="submit" className="checkout-btn" disabled={busy}>
                {busy ? 'Оформляем…' : 'Подтвердить заказ'}
              </button>
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
