export function timezoneOffset(timeZone: string, date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")!
    .value.replace("GMT", "UTC")
}

export function formatZoneTime(
  timeZone: string,
  date: Date,
  timeFormat: "12" | "24",
  showSeconds: boolean
): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    ...(showSeconds ? { second: "2-digit" } : {}),
    hour12: timeFormat === "12",
  }).format(date)
}
