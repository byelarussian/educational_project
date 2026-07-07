import ProductList from '../components/ProductList.jsx'

export default function ProductsPage({ products, loading, message, page, pagination, onPageChange }) {
  return (
    <section className="products-page">
      <div className="page-header">
        <div>
          <h2>Товары</h2>
          <p>Товары, загруженные из магазина FamShop.</p>
        </div>
      </div>

      {message && <div className="message">{message}</div>}

      <ProductList products={products} loading={loading} />

      <div className="pagination">
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={!pagination.previous || loading}>
          Previous
        </button>
        <span>
          Page {page} of {Math.max(1, Math.ceil(pagination.count / 20))}
        </span>
        <button type="button" onClick={() => onPageChange(page + 1)} disabled={!pagination.next || loading}>
          Next
        </button>
      </div>
    </section>
  )
}
