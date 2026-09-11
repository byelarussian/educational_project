import { useState } from 'react'
import SizeSelectModal from './SizeSelectModal.jsx'

const DISPLAY_PRICES = [800, 1000, 1500]

/**
 * Стабильно выбирает одну из трёх цен (800 / 1000 / 1500 ₽) по id товара.
 */
function resolveProductPrice(product) {
  const seed = Number(product?.id)
  const safeSeed = Number.isFinite(seed) && seed > 0
    ? seed
    : Array.from(String(product?.title || product?.product_url || 'fam'), (char) => char.charCodeAt(0))
      .reduce((sum, code) => sum + code, 0)

  return DISPLAY_PRICES[safeSeed % DISPLAY_PRICES.length]
}

/**
 * Форматирует цену карточки витрины.
 */
function formatPrice(price, currency) {
  const amount = Number(price)
  const symbol = String(currency || '₽')
    .replace(/ƃ/g, '₽')
    .replace(/&#0*8381;/g, '₽')
    .replace(/&amp;#0*8381;/g, '₽')

  return `${amount.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${symbol}`
}

function HeartIcon({ filled }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 20.2 10.9 19.2C6.4 15.1 3.5 12.5 3.5 9.3 3.5 6.7 5.5 4.7 8.1 4.7c1.5 0 2.9.7 3.9 1.8 1-1.1 2.4-1.8 3.9-1.8 2.6 0 4.6 2 4.6 4.6 0 3.2-2.9 5.8-7.4 9.9L12 20.2Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 7h13l-1.4 8.2a1.5 1.5 0 0 1-1.5 1.3H9.2a1.5 1.5 0 0 1-1.5-1.2L6.2 4.5H4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="19" r="1.3" fill="currentColor" />
      <circle cx="17" cy="19" r="1.3" fill="currentColor" />
    </svg>
  )
}

/**
 * Карточка товара на витрине: фото, иконки «в корзину» и «в отложенные», цена.
 * И корзина, и отложенные сначала просят выбрать размер.
 */
export default function StoreProductCard({
  product,
  onAddToCart,
  deferred = false,
  deferredBusy = false,
  onToggleDeferred,
  isAuthenticated = false,
}) {
  const price = resolveProductPrice(product)
  const [sizeOpen, setSizeOpen] = useState(false)
  const [sizePurpose, setSizePurpose] = useState('cart')
  const [heartBusy, setHeartBusy] = useState(false)
  const showActions = Boolean(onAddToCart || onToggleDeferred)

  async function handleConfirmSize(size) {
    if (sizePurpose === 'deferred') {
      setHeartBusy(true)
      try {
        const result = await onToggleDeferred?.(product, false, { size })
        if (result?.ok !== false) {
          setSizeOpen(false)
        }
      } finally {
        setHeartBusy(false)
      }
      return
    }

    const result = await onAddToCart?.(product, { size, unitPrice: price })
    if (result?.ok !== false) {
      setSizeOpen(false)
    }
  }

  async function handleHeartClick(event) {
    event.preventDefault()
    event.stopPropagation()
    if (!onToggleDeferred || heartBusy || deferredBusy) return

    if (deferred) {
      setHeartBusy(true)
      try {
        await onToggleDeferred(product, true)
      } finally {
        setHeartBusy(false)
      }
      return
    }

    if (!isAuthenticated) {
      await onToggleDeferred(product, false, { size: '' })
      return
    }

    setSizePurpose('deferred')
    setSizeOpen(true)
  }

  function handleCartClick(event) {
    event.preventDefault()
    event.stopPropagation()
    if (onAddToCart) {
      setSizePurpose('cart')
      setSizeOpen(true)
    }
  }

  return (
    <article className="store-product-card">
      {product.tag ? <span className="store-product-card__tag">{product.tag}</span> : null}
      {showActions ? (
        <div className="store-product-card__actions">
          {onAddToCart ? (
            <button
              type="button"
              className="store-product-card__action"
              aria-label="Добавить в корзину"
              onClick={handleCartClick}
            >
              <CartIcon />
            </button>
          ) : null}
          {onToggleDeferred ? (
            <button
              type="button"
              className={`store-product-card__action store-product-card__action--heart${deferred ? ' is-active' : ''}`}
              aria-label={deferred ? 'Убрать из отложенных' : 'Отложить товар'}
              aria-pressed={deferred}
              disabled={heartBusy || deferredBusy}
              onClick={handleHeartClick}
            >
              <HeartIcon filled={deferred} />
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="store-product-card__media">
        {product.image_url ? (
          <img src={product.image_url} alt={product.title} />
        ) : (
          <div className="store-product-card__placeholder">FAM.CAP</div>
        )}
      </div>
      <p className="store-product-card__brand">{product.brand || product.category?.name || 'FAM.CAP'}</p>
      <h3 className="store-product-card__name">{product.title}</h3>
      <p className="store-product-card__price">{formatPrice(price, product.currency || '₽')}</p>

      <SizeSelectModal
        open={sizeOpen}
        product={product}
        purpose={sizePurpose}
        confirmLabel={sizePurpose === 'deferred' ? 'В отложенные' : 'В корзину'}
        onClose={() => setSizeOpen(false)}
        onConfirm={handleConfirmSize}
      />
    </article>
  )
}
