/**
 * Список задач: карточка с тегами, сроком, категориями и кнопками Edit / Delete / статус.
 */
export default function TaskList({ tasks, onEdit, onDelete, onStatusChange, loading }) {
  if (tasks.length === 0) {
    return <div className="empty-state">No tasks yet. Add one to get started.</div>
  }

  return (
    <div className="task-list">
      {tasks.map((task) => (
        <article className="task-item" key={task.id}>
          <div className="task-meta">
            <strong>{task.title}</strong>
            <div className="task-tags">
              <span>{task.priority}</span>
              <span>{task.status}</span>
            </div>
          </div>

          <p>{task.description || 'No description provided'}</p>
          <p className="task-extra">
            Due: {task.due_date ? new Date(task.due_date).toLocaleString() : 'None'}
          </p>
          <p className="task-extra">
            Categories: {task.categories?.length ? task.categories.map((category) => category.name).join(', ') : 'None'}
          </p>
          <div className="task-actions">
            <button type="button" onClick={() => onEdit(task)} disabled={loading}>
              Edit
            </button>
            <button type="button" onClick={() => onDelete(task.id)} disabled={loading}>
              Delete
            </button>
            {task.status !== 'completed' && (
              <button
                type="button"
                onClick={() => onStatusChange(task.id, 'completed')}
                disabled={loading}
              >
                Complete
              </button>
            )}
            {task.status !== 'in_progress' && (
              <button
                type="button"
                onClick={() => onStatusChange(task.id, 'in_progress')}
                disabled={loading}
              >
                In progress
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}
