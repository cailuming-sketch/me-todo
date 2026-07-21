import { useEffect, useRef, useState } from 'react';
import { MonthPicker } from './components/date/MonthPicker';
import { WeekStrip } from './components/date/WeekStrip';
import { ProgressPanel } from './components/progress/ProgressPanel';
import { CategoryFilter } from './components/tasks/CategoryFilter';
import { TaskDrawer } from './components/tasks/TaskDrawer';
import { TaskList } from './components/tasks/TaskList';
import { formatDateKey, type DateKey } from './domain/date';
import type { Task } from './domain/task';
import { calculateProgress, filterByCategory, tasksForDate } from './domain/taskLogic';
import { useTaskStore } from './state/useTaskStore';
import { getBrowserStorage, LocalStorageTaskRepository } from './storage/localStorageTaskRepository';

const repository = new LocalStorageTaskRepository(getBrowserStorage());

interface Notice {
  id: number;
  message: string;
  canUndo: boolean;
}

export function App({ initialToday }: { initialToday?: DateKey }) {
  const store = useTaskStore(repository);
  const [today, setToday] = useState(() => initialToday ?? formatDateKey(new Date()));
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [monthOpen, setMonthOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null | undefined>(undefined);
  const [notice, setNotice] = useState<Notice | null>(null);
  const noticeIdRef = useRef(0);
  const taskListHeadingRef = useRef<HTMLHeadingElement>(null);
  const dailyTasks = tasksForDate(store.snapshot.tasks, selectedDate);
  const visibleTasks = filterByCategory(dailyTasks, selectedCategory);
  const progress = calculateProgress(dailyTasks);
  const drawerOpen = editingTask !== undefined;
  const modalOpen = drawerOpen || monthOpen;

  useEffect(() => {
    if (initialToday !== undefined) return;
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timeout = window.setTimeout(() => {
      setToday(formatDateKey(new Date()));
    }, Math.max(1, nextMidnight.getTime() - now.getTime()));
    return () => window.clearTimeout(timeout);
  }, [initialToday, today]);

  useEffect(() => {
    if (!notice) return;
    const noticeId = notice.id;
    const timeout = window.setTimeout(() => {
      setNotice((current) => current?.id === noticeId ? null : current);
    }, 4000);
    return () => window.clearTimeout(timeout);
  }, [notice?.id]);

  const showNotice = (message: string, canUndo: boolean) => {
    noticeIdRef.current += 1;
    setNotice({ id: noticeIdRef.current, message, canUndo });
  };

  const selectDate = (date: DateKey) => {
    setSelectedDate(date);
    setMonthOpen(false);
    if (
      selectedCategory &&
      !store.snapshot.categories.some((category) => category.id === selectedCategory)
    ) {
      setSelectedCategory(null);
    }
  };

  const toggleTask = (id: string) => {
    if (modalOpen) return;
    const task = store.snapshot.tasks.find((item) => item.id === id);
    if (task && store.toggleTask(id)) {
      showNotice(task.completed ? '任务已恢复' : '任务已完成', true);
    }
  };

  const deleteTask = (id: string) => {
    if (modalOpen) return;
    if (store.deleteTask(id)) showNotice('任务已删除', true);
  };

  const openTaskDrawer = (task: Task | null) => {
    if (modalOpen) return;
    setEditingTask(task);
  };

  const openMonthPicker = () => {
    if (modalOpen) return;
    setMonthOpen(true);
  };

  const selectBackgroundDate = (date: DateKey) => {
    if (!modalOpen) selectDate(date);
  };

  return (
    <main id="top" className="app-shell">
      <div
        className="app-background"
        data-testid="app-background"
        inert={modalOpen ? true : undefined}
        aria-hidden={modalOpen ? 'true' : undefined}
      >
        <header className="top-nav">
          <a className="brand" href="#top" aria-label="DOO 首页">
            DOO <span>✦</span>
          </a>
          <div className="top-actions">
            <button className="primary-button" type="button" onClick={() => openTaskDrawer(null)}>
              ＋ 新建任务
            </button>
            <span className="avatar" aria-hidden="true">CA</span>
          </div>
        </header>

        <WeekStrip
          selectedDate={selectedDate}
          today={today}
          monthDisabled={drawerOpen}
          onSelect={selectBackgroundDate}
          onOpenMonth={openMonthPicker}
        />
        <CategoryFilter
          categories={store.snapshot.categories}
          tasks={dailyTasks}
          selected={selectedCategory}
          onChange={(categoryId) => {
            if (!modalOpen) setSelectedCategory(categoryId);
          }}
        />

        <div className="main-grid">
          <TaskList
            headingRef={taskListHeadingRef}
            tasks={visibleTasks}
            dailyTaskCount={dailyTasks.length}
            filterActive={selectedCategory !== null}
            isToday={selectedDate === today}
            categories={store.snapshot.categories}
            onCreateFirst={() => openTaskDrawer(null)}
            onClearFilter={() => setSelectedCategory(null)}
            onToggle={toggleTask}
            onEdit={(id) => {
              const task = store.snapshot.tasks.find((item) => item.id === id);
              if (task) openTaskDrawer(task);
            }}
            onDelete={deleteTask}
          />
          <ProgressPanel {...progress} isToday={selectedDate === today} />
        </div>

        <button
          className="mobile-create primary-button"
          type="button"
          aria-label="新建任务"
          onClick={() => openTaskDrawer(null)}
        >
          ＋
        </button>

      </div>

      <MonthPicker
        open={monthOpen && !drawerOpen}
        selectedDate={selectedDate}
        onSelect={selectDate}
        onClose={() => setMonthOpen(false)}
      />
      <TaskDrawer
        open={drawerOpen}
        selectedDate={selectedDate}
        categories={store.snapshot.categories}
        task={editingTask ?? null}
        fallbackFocusRef={taskListHeadingRef}
        onSave={(draft) => {
          const creating = editingTask === null;
          const saved = editingTask
            ? store.updateTask(editingTask.id, draft)
            : store.createTask(draft);
          if (saved) {
            setNotice(null);
            if (creating) setSelectedCategory(null);
          }
          return saved;
        }}
        onAddCategory={(name, color) => {
          const saved = store.addCategory(name, color);
          if (saved) setNotice(null);
          return saved;
        }}
        onClose={() => setEditingTask(undefined)}
      />

      {(store.error || notice) && (
        <section className="snackbar-stack" aria-label="通知">
          {store.error && (
            <div className="snackbar is-error" role="status" aria-live="polite">
              <span>{store.error}</span>
              <button type="button" aria-label="关闭提示" disabled={modalOpen} onClick={store.clearError}>×</button>
            </div>
          )}
          {notice && (
            <div className="snackbar" role="status" aria-live="polite">
              <span>{notice.message}</span>
              {notice.canUndo && (
                <button
                  type="button"
                  disabled={modalOpen}
                  onClick={() => {
                    if (!modalOpen && store.undoLastAction()) setNotice(null);
                  }}
                >
                  撤销
                </button>
              )}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
