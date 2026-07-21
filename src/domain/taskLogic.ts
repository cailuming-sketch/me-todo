import type { Task, TaskDraft } from './task';
import { isDateKey, type DateKey } from './date';

const priorityRank = { high: 0, medium: 1, low: 2 } as const;

export function validateTaskDraft(draft: TaskDraft): Partial<Record<'title' | 'date', string>> {
  const errors: Partial<Record<'title' | 'date', string>> = {};
  if (!draft.title.trim()) errors.title = '请输入任务标题';
  if (!isDateKey(draft.date)) errors.date = '请选择有效日期';
  return errors;
}

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) =>
      Number(a.completed) - Number(b.completed) ||
      priorityRank[a.priority] - priorityRank[b.priority] ||
      a.createdAt.localeCompare(b.createdAt),
  );
}

export const tasksForDate = (tasks: Task[], date: DateKey) => sortTasks(tasks.filter((task) => task.date === date));

export const filterByCategory = (tasks: Task[], categoryId: string | null) =>
  categoryId ? tasks.filter((task) => task.categoryId === categoryId) : tasks;

export function calculateProgress(tasks: Task[]) {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  return { completed, total, percent: total === 0 ? null : Math.round((completed / total) * 100) };
}
