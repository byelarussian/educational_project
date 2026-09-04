import { useState } from 'react'

/**
 * Начальные значения формы категории: пустые при создании, из объекта — при правке.
 */
function categoryToForm(category) {
  if (!category) {
    return {
      name: '',
      description: '',
      color: '#007bff',
    }
  }

  return {
    name: category.name || '',
    description: category.description || '',
    color: category.color || '#007bff',
  }
}

/**
 * Форма категории задач: название, описание и цвет-маркер.
 */
export default function CategoryForm({ category, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(() => categoryToForm(category))

  /** Отдаёт текущие поля формы родителю (создание или обновление категории). */
  function handleSubmit(event) {
    event.preventDefault()
    onSubmit(form)
  }

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <h3>{category ? 'Редактировать категорию' : 'Создать новую категорию'}</h3>
      <label>
        Название
        <input
          type="text"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          required
        />
      </label>
      <label>
        Описание
        <textarea
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
        />
      </label>
      <label>
        Цвет
        <input
          type="color"
          value={form.color}
          onChange={(event) => setForm({ ...form, color: event.target.value })}
        />
      </label>
      <div className="form-actions">
        <button type="submit" disabled={loading}>
          {category ? 'Сохранить категорию' : 'Создать категорию'}
        </button>
        {category && (
          <button type="button" className="secondary" onClick={onCancel} disabled={loading}>
            Отмена
          </button>
        )}
      </div>
    </form>
  )
}
