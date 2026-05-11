import { format } from "date-fns";
import { id } from "date-fns/locale";

export function formatDateLong(date: Date | string) {
  return format(new Date(date), "d MMMM yyyy", { locale: id });
}

export function formatMonthYear(date: Date | string) {
  return format(new Date(date), "MMMM yyyy", { locale: id });
}

export function formatDateShort(date: Date | string) {
  return format(new Date(date), "dd/MM/yyyy", { locale: id });
}

export function formatDateTime(date: Date | string) {
  return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: id });
}

export function getMonthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

  return { end, start };
}

export function getTodayDateValue(date = new Date()) {
  return format(date, "yyyy-MM-dd");
}

export function getMonthInputValue(date = new Date()) {
  return format(date, "yyyy-MM");
}

export function getMonthRangeFromInput(monthInput?: string) {
  const baseDate = monthInput ? new Date(`${monthInput}-01T00:00:00`) : new Date();
  const { end, start } = getMonthRange(baseDate);

  return {
    endDate: format(end, "yyyy-MM-dd"),
    startDate: format(start, "yyyy-MM-dd"),
  };
}

export function getPresetRange({
  date,
  month,
  preset,
  endDate,
  startDate,
}: {
  date?: string;
  endDate?: string;
  month?: string;
  preset?: string;
  startDate?: string;
}) {
  if (preset === "daily") {
    const resolvedDate = date || getTodayDateValue();

    return {
      endDate: resolvedDate,
      label: `Harian ${formatDateLong(resolvedDate)}`,
      preset: "daily" as const,
      startDate: resolvedDate,
    };
  }

  if (preset === "custom" && startDate && endDate) {
    return {
      endDate,
      label: `${formatDateLong(startDate)} - ${formatDateLong(endDate)}`,
      preset: "custom" as const,
      startDate,
    };
  }

  const resolvedMonth = month || getMonthInputValue();
  const monthRange = getMonthRangeFromInput(resolvedMonth);

  return {
    endDate: monthRange.endDate,
    label: `Bulanan ${formatMonthYear(`${resolvedMonth}-01`)}`,
    preset: "monthly" as const,
    startDate: monthRange.startDate,
  };
}
