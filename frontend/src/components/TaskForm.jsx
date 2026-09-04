import { useState } from 'react'

/** Дописывает ведущий ноль к числу (9 → "09") для datetime-local. */
function pad(value) {
  return String(value).padStart(2, '0')
}

/**
 * Переводит ISO-дату с сервера в значение input[type=datetime-local] (YYYY-MM-DDTHH:mm).
 */
function toDatetimeLocalValue(isoString) {
  if (!isoString) return ''
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * Обратно: значение datetime-local → ISO-строка для API, пустое поле → null.
 */
function fromDatetimeLocalValue(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

/**
 * Собирает объект формы из задачи (редактирование) или пустые поля (создание).
 */
function taskToForm(task) {
  if (!task) {
    return {
      title: '',
      description: '',
      priority: 'medium',
      status: 'todo',
      due_date: '',
      category_ids: [],
    }
  }

  return {
    title: task.title || '',
    description: task.description || '',
    priority: task.priority || 'medium',
    status: task.status || 'todo',
    due_date: toDatetimeLocalValue(task.due_date),
    category_ids: task.categories?.map((category) => category.id) || [],
  }
}

/**
 * Форма создания и редактирования задачи: поля, приоритет, статус, срок и мультивыбор категорий.
 */
export default function TaskForm({ task, categories, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(() => taskToForm(task))

  /** Не даёт браузеру перезагрузить страницу и отдаёт родителю форму с ISO-датой. */
  function handleSubmit(event) {
    event.preventDefault()
    onSubmit({
      ...form,
      due_date: fromDatetimeLocalValue(form.due_date),
    })
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
