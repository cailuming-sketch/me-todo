import { isDateKey } from '../domain/date';
import type { AppSnapshot, Category, Task } from '../domain/task';
import { createDefaultSnapshot, type LoadResult, type TaskRepository } from './taskRepository';

export const STORAGE_KEY = 'doo.todo.v1';
export const BACKUP_PREFIX = 'doo.todo.corrupt';
export const STORAGE_UNAVAILABLE_WARNING = '无法读取本地存储，已载入空清单；当前更改将无法保存';

export function getBrowserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const isCategory = (value: unknown): value is Category => {
  const item = value as Category;
  return Boolean(item && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.color === 'string');
};

const isTask = (value: unknown): value is Task => {
  const item = value as Task;
  return Boolean(
    item
      && typeof item.id === 'string'
      && typeof item.title === 'string'
      && isDateKey(item.date)
      && ['high', 'medium', 'low'].includes(item.priority)
      && (item.categoryId === null || typeof item.categoryId === 'string')
      && typeof item.notes === 'string'
      && typeof item.completed === 'boolean'
      && typeof item.createdAt === 'string'
      && typeof item.updatedAt === 'string',
  );
};

const isSnapshot = (value: unknown): value is AppSnapshot => {
  const snapshot = value as AppSnapshot;
  return Boolean(
    snapshot
      && snapshot.schemaVersion === 1
      && Array.isArray(snapshot.tasks)
      && snapshot.tasks.every(isTask)
      && Array.isArray(snapshot.categories)
      && snapshot.categories.every(isCategory),
  );
};

export function migrateSnapshot(value: unknown): AppSnapshot {
  const version = (value as { schemaVersion?: unknown } | null)?.schemaVersion;
  if (version === 1 && isSnapshot(value)) return value;
  throw new Error('Unsupported or invalid snapshot');
}

export class LocalStorageTaskRepository implements TaskRepository {
  private available: boolean;

  constructor(private readonly storage: Storage | null) {
    this.available = storage !== null;
  }

  load(): LoadResult {
    if (!this.storage) {
      return { snapshot: createDefaultSnapshot(), warning: STORAGE_UNAVAILABLE_WARNING };
    }

    let raw: string | null;
    try {
      raw = this.storage.getItem(STORAGE_KEY);
      this.available = true;
    } catch {
      this.available = false;
      return { snapshot: createDefaultSnapshot(), warning: STORAGE_UNAVAILABLE_WARNING };
    }
    if (raw === null) return { snapshot: createDefaultSnapshot(), warning: null };

    try {
      const parsed: unknown = JSON.parse(raw);
      return { snapshot: migrateSnapshot(parsed), warning: null };
    } catch {
      let warning = '检测到损坏的本地数据，已载入空清单并保留备份';
      try {
        this.storage.setItem(`${BACKUP_PREFIX}.${Date.now()}`, raw);
      } catch {
        this.available = false;
        warning = '检测到损坏的本地数据，已载入空清单，但原始数据备份失败';
      }
      return { snapshot: createDefaultSnapshot(), warning };
    }
  }

  save(snapshot: AppSnapshot): void {
    if (!this.storage || !this.available) throw new Error('Local storage is unavailable');
    this.storage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }
}
