import {
  addDays,
  getSevenDayWindow,
  parseDateKey,
  type DateKey,
} from '../../domain/date';

export interface WeekStripProps {
  selectedDate: DateKey;
  today: DateKey;
  monthDisabled?: boolean;
  onSelect: (date: DateKey) => void;
  onOpenMonth: () => void;
}

const weekdayFormatter = new Intl.DateTimeFormat('zh-CN', { weekday: 'short' });

export function WeekStrip({
  selectedDate,
  today,
  monthDisabled = false,
  onSelect,
  onOpenMonth,
}: WeekStripProps) {
  const selected = parseDateKey(selectedDate);
  const dates = getSevenDayWindow(selectedDate);

  return (
    <section aria-label="日期导航">
      <div className="date-heading">
        <button type="button" disabled={monthDisabled} onClick={onOpenMonth}>
          {selected.getFullYear()} 年 {selected.getMonth() + 1} 月
        </button>
        <button type="button" onClick={() => onSelect(today)}>
          今天
        </button>
        <button type="button" aria-label="前一天" onClick={() => onSelect(addDays(selectedDate, -1))}>
          ‹
        </button>
        <button type="button" aria-label="后一天" onClick={() => onSelect(addDays(selectedDate, 1))}>
          ›
        </button>
      </div>
      <div className="week-strip">
        {dates.map((key) => {
          const date = parseDateKey(key);
          const label = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日${key === today ? '，今天' : ''}`;

          return (
            <button
              key={key}
              type="button"
              aria-label={label}
              aria-pressed={key === selectedDate}
              onClick={() => onSelect(key)}
            >
              <span>{weekdayFormatter.format(date)}</span>
              <strong>{date.getDate()}</strong>
            </button>
          );
        })}
      </div>
    </section>
  );
}
