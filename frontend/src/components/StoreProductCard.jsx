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

/**
 * Карточка товара на витрине: фото, бренд, цена и «В корзину» с выбором размера.
 * Регистрация не нужна — размер выбирается в модалке, затем вызывается onAddToCart.
 */
export default function StoreProductCard({ product, onAddToCart }) {
  const href = product.product_url || '#'
  const price = resolveProductPrice(product)
  const installments = price / 4
  const [sizeOpen, setSizeOpen] = useState(false)

  async function handleConfirmSize(size) {
    const result = await onAddToCart?.(product, { size, unitPrice: price })
    if (result?.ok !== false) {
      setSizeOpen(false)
    }
  }

  return (
    <article className="store-product-card">
      {product.tag ? <span className="store-product-card__tag">{product.tag}</span> : null}
      <a className="store-product-card__media" href={href} target="_blank" rel="noreferrer">
        {product.image_url ? (
          <img src={product.image_url} alt={product.title} />
        ) : (
          <div className="store-product-card__placeholder">FAM.CAP</div>
        )}
      </a>
      <p className="store-product-card__brand">{product.brand || product.category?.name || 'FAM.CAP'}</p>
      <h3 className="store-product-card__name">
        <a href={href} target="_blank" rel="noreferrer">
          {product.title}
        </a>
      </h3>
      <p className="store-product-card__price">{formatPrice(price, product.currency || '₽')}</p>
      <p className="store-product-card__installments">
        4 платежа по {formatPrice(installments, product.currency || '₽')}
      </p>
      {onAddToCart ? (
        <button type="button" className="store-product-card__cart" onClick={() => setSizeOpen(true)}>
          В корзину
        </button>
      ) : (
        <a className="store-product-card__cart" href={href} target="_blank" rel="noreferrer">
          В корзину
        </a>
      )}

      <SizeSelectModal
        open={sizeOpen}
        product={product}
        onClose={() => setSizeOpen(false)}
        onConfirm={handleConfirmSize}
      />
    </article>
  )
}
