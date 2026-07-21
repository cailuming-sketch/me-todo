import type { Ref } from 'react';
import type { Category, Task } from '../../domain/task';
import { TaskItem } from './TaskItem';

interface TaskListProps {
  headingRef?: Ref<HTMLHeadingElement>;
  tasks: Task[];
  dailyTaskCount?: number;
  filterActive?: boolean;
  isToday?: boolean;
  categories: Category[];
  onCreateFirst: () => void;
  onClearFilter?: () => void;
  onToggle: (taskId: string) => void;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

export function TaskList({
  headingRef,
  tasks,
  dailyTaskCount = tasks.length,
  filterActive = false,
  isToday = true,
  categories,
  onCreateFirst,
  onClearFilter = () => {},
  onToggle,
  onEdit,
  onDelete,
}: TaskListProps) {
  if (tasks.length === 0) {
    if (filterActive && dailyTaskCount > 0) {
      return (
        <section className="empty-state">
          <h2 ref={headingRef} tabIndex={-1}>该分类暂无任务</h2>
          <p>显示 0 项，共 {dailyTaskCount} 项</p>
          <button type="button" onClick={onClearFilter}>清除筛选</button>
        </section>
      );
    }

    return (
      <section className="empty-state">
        <h2 ref={headingRef} tabIndex={-1}>{isToday ? '今天还没有任务' : '所选日期还没有任务'}</h2>
        <button type="button" onClick={onCreateFirst}>
          {isToday ? '添加今天第一项' : '添加该日第一项'}
        </button>
      </section>
    );
  }

  const pending = tasks.filter((task) => !task.completed);
  const completed = tasks.filter((task) => task.completed);
  const renderTask = (task: Task) => (
    <TaskItem
      key={task.id}
      task={task}
      category={categories.find((category) => category.id === task.categoryId) ?? null}
      onToggle={onToggle}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );

  return (
    <section aria-label="任务清单">
      <p className="task-list-count">
        {filterActive ? `显示 ${tasks.length} 项，共 ${dailyTaskCount} 项` : `共 ${dailyTaskCount} 项`}
      </p>
      <h2 ref={headingRef} tabIndex={-1}>待完成 · {pending.length}</h2>
      {pending.map(renderTask)}
      <details open>
        <summary>已完成 · {completed.length}</summary>
        {completed.map(renderTask)}
      </details>
    </section>
  );
}
