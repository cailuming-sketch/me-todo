import { useRef, useState } from 'react';
import type { AppSnapshot, Task, TaskDraft } from '../domain/task';
import type { TaskRepository } from '../storage/taskRepository';

export function useTaskStore(repository: TaskRepository) {
  const [loaded] = useState(() => repository.load());
  const [snapshot, setSnapshot] = useState(loaded.snapshot);
  const [error, setError] = useState<string | null>(loaded.warning);
  const snapshotRef = useRef(loaded.snapshot);
  const undoRef = useRef<AppSnapshot | null>(null);

  const commit = (next: AppSnapshot, undoable = false): boolean => {
    const previous = snapshotRef.current;
    try {
      repository.save(next);
      undoRef.current = undoable ? previous : null;
      snapshotRef.current = next;
      setSnapshot(next);
      setError(null);
      return true;
    } catch {
      setError('保存失败，内容尚未写入浏览器');
      return false;
    }
  };

  const createTask = (draft: TaskDraft): boolean => {
    const current = snapshotRef.current;
    const now = new Date().toISOString();
    const task: Task = {
      ...draft,
      title: draft.title.trim(),
      notes: draft.notes.trim(),
      id: crypto.randomUUID(),
      completed: false,
      createdAt: now,
      updatedAt: now,
    };
    return commit({ ...current, tasks: [...current.tasks, task] });
  };

  const updateTask = (id: string, draft: TaskDraft): boolean => {
    const current = snapshotRef.current;
    if (!current.tasks.some((task) => task.id === id)) return false;
    const updatedAt = new Date().toISOString();
    return commit({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === id ? { ...task, ...draft, title: draft.title.trim(), notes: draft.notes.trim(), updatedAt } : task,
      ),
    });
  };

  const toggleTask = (id: string): boolean => {
    const current = snapshotRef.current;
    if (!current.tasks.some((task) => task.id === id)) return false;
    return commit(
      {
        ...current,
        tasks: current.tasks.map((task) =>
          task.id === id ? { ...task, completed: !task.completed, updatedAt: new Date().toISOString() } : task,
        ),
      },
      true,
    );
  };

  const deleteTask = (id: string): boolean => {
    const current = snapshotRef.current;
    if (!current.tasks.some((task) => task.id === id)) return false;
    return commit({ ...current, tasks: current.tasks.filter((task) => task.id !== id) }, true);
  };

  const addCategory = (name: string, color: string): boolean => {
    const current = snapshotRef.current;
    const normalized = name.trim();
    if (!normalized) {
      setError('请输入分类名称');
      return false;
    }
    if (
      current.categories.some(
        (category) => category.name.toLocaleLowerCase('zh-CN') === normalized.toLocaleLowerCase('zh-CN'),
      )
    ) {
      setError('分类名称已存在');
      return false;
    }
    return commit({
      ...current,
      categories: [...current.categories, { id: crypto.randomUUID(), name: normalized, color }],
    });
  };

  const undoLastAction = (): boolean => {
    const previous = undoRef.current;
    if (!previous) return false;
    try {
      repository.save(previous);
      undoRef.current = null;
      snapshotRef.current = previous;
      setSnapshot(previous);
      setError(null);
      return true;
    } catch {
      setError('撤销失败，当前内容未改变');
      return false;
    }
  };

  const clearError = () => setError(null);

  return { snapshot, error, createTask, updateTask, toggleTask, deleteTask, addCategory, undoLastAction, clearError };
}
