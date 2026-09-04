/** Список категорий задач с цветной меткой и кнопками Edit / Delete. */
export default function CategoryList({ categories, onEdit, onDelete, loading }) {
  if (categories.length === 0) {
    return <div className="empty-state">No categories available yet.</div>
  }

  return (
    <div className="category-list">
      {categories.map((category) => (
        <article className="category-item" key={category.id}>
          <div className="category-meta">
            <span className="category-color" style={{ background: category.color }} />
            <div>
              <strong>{category.name}</strong>
              <p>{category.description || 'No description'}</p>
            </div>
          </div>
          <div className="category-actions">
            <button type="button" onClick={() => onEdit(category)} disabled={loading}>
              Edit
            </button>
            <button type="button" onClick={() => onDelete(category.id)} disabled={loading}>
              Delete
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}
