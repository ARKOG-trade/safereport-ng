export function formatDate(value: unknown): string {
  if (value == null) {
    return "Unknown";
  }

  try {
    let date: Date;

    const maybeDateLike = value as { toDate?: () => Date };
    if (typeof maybeDateLike.toDate === "function") {
      date = maybeDateLike.toDate();
    } else if (value instanceof Date) {
      date = value;
    } else {
      date = new Date(value as string);
    }

    if (Number.isNaN(date.getTime())) {
      return "Unknown";
    }

    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "Unknown";
  }
}
