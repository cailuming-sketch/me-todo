import type { AppSnapshot } from '../domain/task';

export interface TaskRepository {
  load(): LoadResult;
  save(snapshot: AppSnapshot): void;
}

export interface LoadResult {
  snapshot: AppSnapshot;
  warning: string | null;
}

export const DEFAULT_CATEGORIES = [
  { id: 'work', name: '工作', color: '#ff847c' },
  { id: 'life', name: '生活', color: '#68cbb6' },
  { id: 'growth', name: '成长', color: '#f1bd3e' },
] as const;

export function createDefaultSnapshot(): AppSnapshot {
  return {
    schemaVersion: 1,
    tasks: [],
    categories: DEFAULT_CATEGORIES.map((item) => ({ ...item })),
  };
}
