import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultSnapshot } from './taskRepository';
import { BACKUP_PREFIX, LocalStorageTaskRepository, STORAGE_KEY } from './localStorageTaskRepository';

describe('LocalStorageTaskRepository', () => {
  beforeEach(() => localStorage.clear());

  it('returns default categories when storage is empty', () => {
    expect(new LocalStorageTaskRepository(localStorage).load()).toEqual({
      snapshot: createDefaultSnapshot(),
      warning: null,
    });
  });

  it('round trips a versioned snapshot', () => {
    const repository = new LocalStorageTaskRepository(localStorage);
    const snapshot = createDefaultSnapshot();
    snapshot.tasks.push({
      id: '1',
      title: '阅读',
      date: '2026-07-20',
      priority: 'medium',
      categoryId: 'growth',
      notes: '',
      completed: false,
      createdAt: '2026-07-20T08:00:00.000Z',
      updatedAt: '2026-07-20T08:00:00.000Z',
    });
    repository.save(snapshot);
    expect(repository.load()).toEqual({ snapshot, warning: null });
  });

  it('backs up malformed data and returns defaults', () => {
    vi.setSystemTime(new Date('2026-07-20T10:00:00.000Z'));
    localStorage.setItem(STORAGE_KEY, '{bad json');
    const result = new LocalStorageTaskRepository(localStorage).load();
    expect(result).toEqual({
      snapshot: createDefaultSnapshot(),
      warning: '检测到损坏的本地数据，已载入空清单并保留备份',
    });
    expect(localStorage.getItem(`${BACKUP_PREFIX}.1784541600000`)).toBe('{bad json');
  });

  it.each([
    ['an unknown schema', { schemaVersion: 2, tasks: [], categories: [] }],
    ['an invalid current schema', { schemaVersion: 1, tasks: [{ id: 'broken' }], categories: [] }],
  ])('backs up %s and returns defaults', (_name, value) => {
    vi.setSystemTime(new Date('2026-07-20T11:00:00.000Z'));
    const raw = JSON.stringify(value);
    localStorage.setItem(STORAGE_KEY, raw);

    expect(new LocalStorageTaskRepository(localStorage).load()).toEqual({
      snapshot: createDefaultSnapshot(),
      warning: '检测到损坏的本地数据，已载入空清单并保留备份',
    });
    expect(localStorage.getItem(`${BACKUP_PREFIX}.1784545200000`)).toBe(raw);
  });

  it('reports when a corrupt-data backup cannot be written', () => {
    const storage = {
      getItem: vi.fn(() => '{bad json'),
      setItem: vi.fn(() => {
        throw new DOMException('blocked', 'SecurityError');
      }),
    } as unknown as Storage;

    expect(new LocalStorageTaskRepository(storage).load()).toEqual({
      snapshot: createDefaultSnapshot(),
      warning: '检测到损坏的本地数据，已载入空清单，但原始数据备份失败',
    });
  });

  it('falls back with a warning when storage reads throw and rejects later writes', () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new DOMException('blocked', 'SecurityError');
      }),
      setItem: vi.fn(),
    } as unknown as Storage;
    const repository = new LocalStorageTaskRepository(storage);

    expect(repository.load()).toEqual({
      snapshot: createDefaultSnapshot(),
      warning: '无法读取本地存储，已载入空清单；当前更改将无法保存',
    });
    expect(() => repository.save(createDefaultSnapshot())).toThrow();
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
