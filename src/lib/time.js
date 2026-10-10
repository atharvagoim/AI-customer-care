// "2:19 am" — matches the lowercase timestamps in the design.
export function clock(date) {
  return new Date(date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase();
}

export function relative(date) {
  const d = new Date(date);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return clock(d);
  if (diff < 7 * 86400) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}
