/** Сетка товаров служебной страницы /products: фото, бренд, цена, ссылка на оригинал. */
export default function ProductList({ products, loading }) {
  if (loading) {
    return <div className="empty-state">Loading products…</div>
  }

  if (!products || products.length === 0) {
    return <div className="empty-state">No products available yet.</div>
  }

  return (
    <div className="product-list">
      {products.map((product) => (
        <article className="product-card" key={product.id}>
          {product.image_url && (
            <div className="product-image">
              <img src={product.image_url} alt={product.title} />
            </div>
          )}
          <div className="product-info">
            <h3>{product.title}</h3>
            <p>{product.brand || 'No brand'}</p>
            <p>{product.tag || 'No tag'}</p>
            <p>
              {product.price ? `${product.price} ${product.currency || ''}` : 'Price unavailable'}
            </p>
            <a href={product.product_url} target="_blank" rel="noreferrer">
              View product
            </a>
          </div>
        </article>
      ))}
    </div>
  )
}
