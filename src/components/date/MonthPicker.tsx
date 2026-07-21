import { useEffect, useRef, useState } from 'react';
import {
  formatDateKey,
  getMonthGrid,
  parseDateKey,
  type DateKey,
} from '../../domain/date';
import { trapTab } from '../trapTab';

export interface MonthPickerProps {
  open: boolean;
  selectedDate: DateKey;
  onSelect: (date: DateKey) => void;
  onClose: () => void;
}

const weekdays = ['一', '二', '三', '四', '五', '六', '日'];

const shiftMonth = (key: DateKey, amount: number): DateKey => {
  const current = parseDateKey(key);
  return formatDateKey(new Date(current.getFullYear(), current.getMonth() + amount, 1));
};

export function MonthPicker({ open, selectedDate, onSelect, onClose }: MonthPickerProps) {
  const [viewDate, setViewDate] = useState(selectedDate);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (open) setViewDate(selectedDate);
  }, [open, selectedDate]);

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    dialogRef.current?.querySelector<HTMLElement>('button')?.focus();
    return () => previousFocus?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="dialog-backdrop">
      <section
        ref={dialogRef}
        className="month-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="month-picker-title"
        onKeyDown={trapTab}
      >
        <header>
          <button
            type="button"
            aria-label="上个月"
            onClick={() => setViewDate(shiftMonth(viewDate, -1))}
          >
            ‹
          </button>
          <h2 id="month-picker-title">选择日期</h2>
          <button
            type="button"
            aria-label="下个月"
            onClick={() => setViewDate(shiftMonth(viewDate, 1))}
          >
            ›
          </button>
        </header>
        <div className="month-grid">
          {weekdays.map((weekday) => (
            <span key={weekday}>{weekday}</span>
          ))}
          {getMonthGrid(viewDate).map((key) => {
            const date = parseDateKey(key);
            const label = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;

            return (
              <button
                key={key}
                type="button"
                aria-label={label}
                aria-pressed={key === selectedDate}
                onClick={() => {
                  onSelect(key);
                  onClose();
                }}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
