import CategoryForm from '../components/CategoryForm.jsx'
import CategoryList from '../components/CategoryList.jsx'

export default function CategoriesPage({
  categories,
  loading,
  message,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  editingCategory,
  onEditCategory,
  onCancelEdit,
}) {
  return (
    <section className="tasks-page">
      <div className="page-header">
        <div>
          <h2>Категории</h2>
          <p>Управляйте категориями для организации ваших задач.</p>
        </div>
      </div>

      {message && <div className="message">{message}</div>}

      <div className="task-grid">
        <CategoryForm
          category={editingCategory}
          onSubmit={editingCategory ? (form) => onUpdateCategory(editingCategory.id, form) : onCreateCategory}
          onCancel={onCancelEdit}
          loading={loading}
        />

        <div className="task-list-panel">
          <CategoryList categories={categories} onEdit={onEditCategory} onDelete={onDeleteCategory} loading={loading} />
        </div>
      </div>
    </section>
  )
}
