import type { Category, Task } from '../../domain/task';

interface TaskItemProps {
  task: Task;
  category: Category | null;
  onToggle: (taskId: string) => void;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

const priorityLabels = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级',
} as const;

export function TaskItem({ task, category, onToggle, onEdit, onDelete }: TaskItemProps) {
  return (
    <article className={`task-item ${task.completed ? 'is-complete' : ''}`}>
      <input
        type="checkbox"
        checked={task.completed}
        aria-label={`${task.completed ? '取消完成' : '完成'}“${task.title}”`}
        onChange={() => onToggle(task.id)}
      />
      <div className="task-content">
        <h3>{task.completed ? <s>{task.title}</s> : task.title}</h3>
        <p>
          <span className="task-category">{category?.name ?? '未分类'}</span>
          <span aria-hidden="true"> · </span>
          <span>{priorityLabels[task.priority]}</span>
          {task.notes && (
            <>
              <span aria-hidden="true"> · </span>
              <span>有备注</span>
            </>
          )}
        </p>
      </div>
      <details>
        <summary aria-label={`更多操作：${task.title}`}>•••</summary>
        <button type="button" aria-label={`编辑“${task.title}”`} onClick={() => onEdit(task.id)}>
          编辑
        </button>
        <button type="button" aria-label={`删除“${task.title}”`} onClick={() => onDelete(task.id)}>
          删除
        </button>
      </details>
    </article>
  );
}
