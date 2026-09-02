import TaskForm from '../components/TaskForm.jsx'
import TaskList from '../components/TaskList.jsx'

export default function TasksPage({
  tasks,
  categories,
  loading,
  message,
  search,
  page,
  pagination,
  onSearch,
  onPageChange,
  onEditTask,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onStatusChange,
  editingTask,
  onCancelEdit,
  formResetKey = 0,
}) {
  return (
    <section className="tasks-page">
      <div className="page-header">
        <div>
          <h2>Задачи</h2>
          <p>Управляйте своими задачами, ищите и редактируйте элементы.</p>
        </div>
        <div className="search-input">
          <input
            type="search"
            placeholder="Поиск задач..."
            value={search}
            onChange={(event) => onSearch(event.target.value)}
          />
        </div>
      </div>

      {message && <div className="message">{message}</div>}

      <div className="task-grid">
        <TaskForm
          key={editingTask ? `edit-${editingTask.id}` : `create-${formResetKey}`}
          task={editingTask}
          categories={categories}
          onSubmit={editingTask ? (form) => onUpdateTask(editingTask.id, form) : onCreateTask}
          onCancel={onCancelEdit}
          loading={loading}
        />

        <div className="task-list-panel">
          <TaskList
            tasks={tasks}
            onEdit={onEditTask}
            onDelete={onDeleteTask}
            onStatusChange={onStatusChange}
            loading={loading}
          />
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
        </div>
      </div>
    </section>
  )
}
