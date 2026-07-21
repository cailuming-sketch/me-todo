import type { DateKey } from './date';

export type Priority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  title: string;
  date: DateKey;
  priority: Priority;
  categoryId: string | null;
  notes: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface TaskDraft {
  title: string;
  date: DateKey;
  priority: Priority;
  categoryId: string | null;
  notes: string;
}

export interface AppSnapshot {
  schemaVersion: 1;
  tasks: Task[];
  categories: Category[];
}
