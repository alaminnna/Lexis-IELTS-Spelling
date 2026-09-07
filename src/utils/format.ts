export function formatPercent(n: number) {
  return `${Math.round(n)}%`
}
export function formatAccuracy(correct: number, attempts: number) {
  if (!attempts) return 0
  return (correct / attempts) * 100
}
export function formatTime(ms: number | null) {
  if (ms == null) return "—"
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}
export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
