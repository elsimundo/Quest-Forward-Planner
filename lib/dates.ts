const DOW_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export type DowName = (typeof DOW_NAMES)[number];

export type DayInfo = {
  date: string; // ISO yyyy-mm-dd
  dow: DowName;
  isWeekend: boolean;
  isMonday: boolean;
  isPast: boolean;
  isToday: boolean;
};

export function enumerateDays(from: string, to: string): DayInfo[] {
  const days: DayInfo[] = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  const today = todayIso();
  while (cursor <= end) {
    const dowIndex = cursor.getUTCDay();
    const date = cursor.toISOString().slice(0, 10);
    days.push({
      date,
      dow: DOW_NAMES[dowIndex],
      isWeekend: dowIndex === 0 || dowIndex === 6,
      isMonday: dowIndex === 1,
      isPast: date < today,
      isToday: date === today,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export function fmtDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function fmtDateLong(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export const DOW_FULL: Record<DowName, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
