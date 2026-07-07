import { useEffect, useState } from 'react'

const initialForm = {
  name: '',
  description: '',
  color: '#007bff',
}

export default function CategoryForm({ category, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(initialForm)

  useEffect(() => {
    if (category) {
      setForm({
        name: category.name || '',
        description: category.description || '',
        color: category.color || '#007bff',
      })
    } else {
      setForm(initialForm)
    }
  }, [category])

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
