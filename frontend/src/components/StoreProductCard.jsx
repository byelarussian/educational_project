function formatPrice(price, currency) {
  if (price === null || price === undefined || price === '') {
    return 'Цена по запросу'
  }

  const amount = Number(price)
  if (Number.isNaN(amount)) {
    return 'Цена по запросу'
  }

  return `${amount.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency || '₽'}`
}

export default function StoreProductCard({ product }) {
  const href = product.product_url || '#'
  const installments = product.price ? Number(product.price) / 4 : null

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
      <p className="store-product-card__price">{formatPrice(product.price, product.currency)}</p>
      {installments ? (
        <p className="store-product-card__installments">
          4 платежа по {formatPrice(installments, product.currency)}
        </p>
      ) : null}
      <a className="store-product-card__cart" href={href} target="_blank" rel="noreferrer">
        В корзину
      </a>
    </article>
  )
}
