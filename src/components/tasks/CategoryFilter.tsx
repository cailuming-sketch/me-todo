import type { Category, Task } from '../../domain/task';

interface CategoryFilterProps {
  categories: Category[];
  tasks: Task[];
  selected: string | null;
  onChange: (categoryId: string | null) => void;
}

export function CategoryFilter({ categories, tasks, selected, onChange }: CategoryFilterProps) {
  return (
    <nav aria-label="按分类筛选" className="category-filter">
      <button type="button" aria-pressed={selected === null} onClick={() => onChange(null)}>
        全部 {tasks.length}
      </button>
      {categories.map((category) => {
        const count = tasks.filter((task) => task.categoryId === category.id).length;
        return (
          <button
            key={category.id}
            type="button"
            aria-pressed={selected === category.id}
            onClick={() => onChange(category.id)}
          >
            <span aria-hidden="true" style={{ backgroundColor: category.color }} />
            {category.name} {count}
          </button>
        );
      })}
    </nav>
  );
}
