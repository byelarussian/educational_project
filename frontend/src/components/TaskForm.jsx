import { useEffect, useState } from 'react'

const initialForm = {
  title: '',
  description: '',
  priority: 'medium',
  status: 'todo',
  due_date: '',
  category_ids: [],
}

export default function TaskForm({ task, categories, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(initialForm)

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'medium',
        status: task.status || 'todo',
        due_date: task.due_date ? task.due_date.replace('Z', '') : '',
        category_ids: task.categories?.map((category) => category.id) || [],
      })
    } else {
      setForm(initialForm)
    }
  }, [task])

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit(form)
  }

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <h3>{task ? 'Редактировать задачу' : 'Создать новую задачу'}</h3>
      <label>
        Название
        <input
          type="text"
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
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
        Приоритет
        <select
          value={form.priority}
          onChange={(event) => setForm({ ...form, priority: event.target.value })}
        >
          <option value="low">Низкий</option>
          <option value="medium">Средний</option>
          <option value="high">Высокий</option>
        </select>
      </label>
      <label>
        Статус
        <select
          value={form.status}
          onChange={(event) => setForm({ ...form, status: event.target.value })}
        >
          <option value="todo">К выполнению</option>
          <option value="in_progress">В процессе</option>
          <option value="completed">Завершено</option>
        </select>
      </label>
      <label>
        Срок выполнения
        <input
          type="datetime-local"
          value={form.due_date}
          onChange={(event) => setForm({ ...form, due_date: event.target.value })}
        />
      </label>
      <label>
        Категории
        <select
          multiple
          value={form.category_ids}
          onChange={(event) => {
            const selected = Array.from(event.target.selectedOptions, (option) => Number(option.value))
            setForm({ ...form, category_ids: selected })
          }}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <div className="form-actions">
        <button type="submit" disabled={loading}>
          {task ? 'Сохранить задачу' : 'Создать задачу'}
        </button>
        {task && (
          <button type="button" className="secondary" onClick={onCancel} disabled={loading}>
            Отмена
          </button>
        )}
      </div>
    </form>
  )
}
