export type DateKey = string;

const pad = (value: number) => String(value).padStart(2, '0');

export function formatDateKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDateKey(key: DateKey): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function isDateKey(value: string): value is DateKey {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return formatDateKey(parseDateKey(value)) === value;
}

export function addDays(key: DateKey, amount: number): DateKey {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + amount);
  return formatDateKey(date);
}

export function getSevenDayWindow(key: DateKey): DateKey[] {
  return Array.from({ length: 7 }, (_, index) => addDays(key, index - 3));
}

export function getMonthGrid(key: DateKey): DateKey[] {
  const selected = parseDateKey(key);
  const first = new Date(selected.getFullYear(), selected.getMonth(), 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = formatDateKey(new Date(first.getFullYear(), first.getMonth(), 1 - mondayOffset));
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}
