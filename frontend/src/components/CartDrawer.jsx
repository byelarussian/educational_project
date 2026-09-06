import { Link } from 'react-router-dom'
import { useEffect } from 'react'
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

/**
 * Боковая корзина справа (как на famshop.ru): оверлей + панель со списком и итогом.
 */
export default function CartDrawer({
  open,
  cart,
  busy = false,
  onClose,
  onQuantity,
  onRemove,
}) {
  const items = cart?.items || []

  useEffect(() => {
    if (!open) return undefined

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose?.()
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  return (
    <div className={`store-cart-drawer ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <button
        type="button"
        className="store-cart-drawer__backdrop"
        aria-label="Закрыть корзину"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
      />
      <aside
        className="store-cart-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="store-cart-drawer-title"
      >
        <header className="store-cart-drawer__header">
          <h2 id="store-cart-drawer-title">Корзина</h2>
          <button type="button" className="store-cart-drawer__close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </header>

        <div className="store-cart-drawer__body">
          {items.length ? (
            <ul className="store-cart-drawer__list">
              {items.map((item) => (
                <li key={item.id}>
                  {item.product?.image_url ? (
                    <img src={item.product.image_url} alt="" />
                  ) : (
                    <span className="store-cart-drawer__thumb" />
                  )}
                  <div className="store-cart-drawer__info">
                    <p>{item.product?.title}</p>
                    {item.size ? <small>Размер: {item.size}</small> : null}
                    <strong>{formatPrice(item.product?.price, item.product?.currency)}</strong>
                    <div className="store-cart-drawer__row">
                      <div className="store-cart-drawer__qty">
                        <button
                          type="button"
                          onClick={() => onQuantity?.(item, item.quantity - 1)}
                          disabled={busy || item.quantity <= 1}
                          aria-label="Уменьшить количество"
                        >
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => onQuantity?.(item, item.quantity + 1)}
                          disabled={busy}
                          aria-label="Увеличить количество"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="store-cart-drawer__remove"
                        onClick={() => onRemove?.(item)}
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
            <div className="store-cart-drawer__empty">
              <p>Корзина пуста.</p>
            </div>
          )}
        </div>

        {items.length ? (
          <footer className="store-cart-drawer__footer">
            <div className="store-cart-drawer__total">
              <span>Итого</span>
              <strong>{formatPrice(cart.total)}</strong>
            </div>
            <Link className="store-cart-drawer__checkout" to="/checkout" onClick={onClose}>
              Оформить заказ
            </Link>
          </footer>
        ) : null}
      </aside>
    </div>
  )
}
