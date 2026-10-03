export function dateLabel(value: Date | string | null) {
  if (!value) return "Dato aftales";
  return new Intl.DateTimeFormat("da-DK", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Copenhagen",
  }).format(new Date(value));
}

export function shortDate(value: Date | string | null) {
  if (!value) return "Dato aftales";
  return new Intl.DateTimeFormat("da-DK", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Copenhagen",
  }).format(new Date(value));
}
