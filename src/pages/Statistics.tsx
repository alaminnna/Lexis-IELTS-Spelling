import { useEffect, useMemo, useRef } from "react"
import { useAppStore } from "@/store/useAppStore"
import { WORDS } from "@/data/words"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, PieChart, Pie, Cell } from "recharts"
import { accuracyOverTime, categoryPerformance, mistakeBreakdown } from "@/services/statistics"
import { mistakeLabel } from "@/services/mistakeAnalysis"
import gsap from "gsap"

const COLORS = ["#e55a2b", "#0ea5e9", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#64748b", "#14b8a6"]

export default function Statistics() {
  const env = useAppStore(s => s.envelope)
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!rootRef.current) return
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReduced || !env || env.attempts.length === 0) return
    const ctx = gsap.context(() => {
      gsap.fromTo(".stat-chart", { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: "power3.out" })
    }, rootRef)
    return () => ctx.revert()
  }, [env?.attempts.length])
  if (!env) return null
  const wordToCat = useMemo(() => new Map(WORDS.map(w => [w.id, w.category])), [])
  const accSeries = accuracyOverTime(env.attempts, 14)
  const catPerf = categoryPerformance(env.attempts, wordToCat)
  const mistakes = mistakeBreakdown(env.attempts)
  const mastery = (() => {
    const counts = { critical: 0, weak: 0, learning: 0, strong: 0, mastered: 0 }
    for (const p of Object.values(env.wordProgress)) counts[p.masteryTier as keyof typeof counts]++
    const untouched = WORDS.length - Object.keys(env.wordProgress).length
    return [
      { name: "Critical", value: counts.critical },
      { name: "Weak", value: counts.weak },
      { name: "Learning", value: counts.learning },
      { name: "Strong", value: counts.strong },
      { name: "Mastered", value: counts.mastered },
      { name: "Untouched", value: untouched },
    ].filter(d => d.value > 0)
  })()

  // heatmap: last 35 days
  const heatDays = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of env.sessions) {
      const d = s.startedAt.slice(0, 10)
      map.set(d, (map.get(d) || 0) + s.wordIds.length)
    }
    const days: { date: string; count: number }[] = []
    for (let i = 34; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const iso = d.toISOString().slice(0, 10)
      days.push({ date: iso.slice(5), count: map.get(iso) || 0 })
    }
    return days
  }, [env.sessions])

  return (
    <div ref={rootRef} className="max-w-[1120px] mx-auto px-4 lg:px-6 py-6 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Statistics</h1>

      {env.attempts.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="font-medium">No data yet</p>
          <p className="text-sm text-muted-foreground">Complete a practice session to see charts.</p>
        </Card>
      ) : (
        <>
          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="stat-chart lg:col-span-2">
              <CardHeader><CardTitle>Accuracy Over Time</CardTitle></CardHeader>
              <CardContent className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={accSeries}>
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="accuracy" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="stat-chart">
              <CardHeader><CardTitle>Mastery</CardTitle></CardHeader>
              <CardContent className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={mastery} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={2}>
                      {mastery.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-1.5 justify-center mt-1">
                  {mastery.map((m, i) => <span key={m.name} className="text-[11px] flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{m.name} {m.value}</span>)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="stat-chart">
            <CardHeader><CardTitle>Practice Activity</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1.5">
                {heatDays.map(d => {
                  const v = d.count
                  const intensity = v === 0 ? "bg-muted" : v < 10 ? "bg-amber-200 dark:bg-amber-900" : v < 25 ? "bg-orange-400" : "bg-red-500"
                  return <div key={d.date} className={`h-8 rounded-md grid place-items-center text-[10px] ${intensity} border`}>{v || ""}</div>
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Last 35 days • darker = more words</p>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="stat-chart">
              <CardHeader><CardTitle>Mistake Types</CardTitle></CardHeader>
              <CardContent className="h-[240px]">
                {mistakes.length === 0 ? <p className="text-sm text-muted-foreground text-center py-12">No mistakes — perfect!</p> :
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mistakes.map(m => ({ name: mistakeLabel(m.type as any), count: m.count }))}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-18} dy={10} height={60} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                }
              </CardContent>
            </Card>

            <Card className="stat-chart">
              <CardHeader><CardTitle>Category Performance</CardTitle></CardHeader>
              <CardContent className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={catPerf} layout="vertical">
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="category" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="accuracy" fill="hsl(var(--foreground))" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
