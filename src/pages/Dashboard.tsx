import { Link } from "react-router-dom"
import { useAppStore } from "@/store/useAppStore"
import { WORDS } from "@/data/words"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { ProgressRing } from "@/components/ui/ProgressRing"
import { xpProgress } from "@/services/scoring"
import { DashboardAmbient } from "@/components/effects/AmbientBackground"
import { useUiSound } from "@/hooks/useUiSound"
import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat-card rounded-xl border bg-card p-4 hover:shadow-sm hover:border-foreground/10 transition-all duration-200 will-change-transform">
      <div className="text-[11px] tracking-wide uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-[22px] font-semibold tracking-tight tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  )
}

export default function Dashboard() {
  const env = useAppStore(s => s.envelope)
  const ui = useUiSound()
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.title = "Dashboard — Lexis"
    const meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null
    if (meta) meta.content = "Your personal IELTS spelling progress — words learned, accuracy, streak, and mastery."
  }, [])

  // GSAP reveal — super smooth, respects reduced motion
  useEffect(() => {
    if (!rootRef.current) return
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReduced) return
    const ctx = gsap.context(() => {
      gsap.fromTo(".hero-reveal", { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" })
      gsap.fromTo(".stat-card", { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.07, ease: "power3.out", delay: 0.18 })
      gsap.fromTo(".dash-card", { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.09, ease: "power3.out", delay: 0.32 })
      // quick actions hover polish handled via CSS, but add scroll trigger for reveal
      gsap.fromTo(".quick-card", { y: 10, opacity: 0 }, {
        y: 0, opacity: 1, duration: 0.4, stagger: 0.08, ease: "power2.out",
        scrollTrigger: { trigger: ".quick-card", start: "top 92%" }
      })
    }, rootRef)
    return () => ctx.revert()
  }, [])

  if (!env) return null
  const attempts = env.attempts
  const totalPracticed = Object.keys(env.wordProgress).length
  const correct = attempts.filter(a => a.isCorrect).length
  const acc = attempts.length ? (correct / attempts.length) * 100 : 0
  const displayName = env.userProfile?.name?.trim() ? env.userProfile.name.trim() : "there"
  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` })()
  const todayAttempts = attempts.filter(a => {
    // attempts timestamp is ISO UTC; convert to local YYYY-MM-DD for comparison
    const d = new Date(a.timestampISO)
    const local = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
    return local === today
  })
  const todayCorrect = todayAttempts.filter(a => a.isCorrect).length
  const todayAcc = todayAttempts.length ? (todayCorrect / todayAttempts.length) * 100 : 0
  const mastered = Object.values(env.wordProgress).filter(p => p.masteryScore >= 95).length
  const weak = Object.values(env.wordProgress).filter(p => p.masteryScore <= 59 && p.attempts > 0).length
  const { level, pct } = xpProgress(env.gamification.xp)
  const daily = env.dailyProgress[today]
  const goal = env.settings.dailyGoal
  const dailyPct = daily ? Math.min(100, (daily.count / goal) * 100) : 0

  const totalMs = Object.values(env.wordProgress).reduce((s, p) => s + (p.totalResponseMs || 0), 0)
  const practiceMins = Math.round(totalMs / 60000)

  const weakest = Object.values(env.wordProgress)
    .filter(p => p.attempts > 0)
    .sort((a, b) => a.masteryScore - b.masteryScore)
    .slice(0, 6)

  const recent = [...env.sessions].reverse().slice(0, 3)

  return (
    <div ref={rootRef} className="max-w-[1120px] mx-auto px-4 lg:px-6 py-6 space-y-6">
      {/* Hero */}
      <div className="hero-reveal relative rounded-[20px] border bg-[hsl(var(--surface-2))] p-6 lg:p-8 flex flex-col lg:flex-row lg:items-center gap-6 overflow-hidden">
        <DashboardAmbient variant="warm" />
        <div className="flex-1 relative">
          <p className="text-[11px] tracking-[0.14em] uppercase text-muted-foreground">How you’re doing, {displayName}</p>
          <h1 className="mt-1 text-[28px] lg:text-[34px] font-semibold tracking-[-0.03em] leading-none">
            {attempts.length === 0 ? `Good to see you.` : `Good to see you back.`}
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground max-w-[560px]">
            {attempts.length === 0
              ? `You haven't practiced yet. Start your first practice session to build your progress.`
              : `You’ve practiced ${attempts.length} times with ${Math.round(acc)}% average accuracy. Keep the streak alive.`}
          </p>
          <div className="mt-4 flex gap-2">
            <Link to="/practice?mode=listen" onClick={() => ui.pop()}><Button size="lg">Start Listen & Type</Button></Link>
            <Link to="/words" onClick={() => ui.softClick()}><Button variant="outline" size="lg">Browse words</Button></Link>
          </div>
        </div>
        <div className="flex items-center gap-4 lg:gap-6 relative">
          <div className="text-center">
            <ProgressRing value={dailyPct} size={84} stroke={7}>{daily ? `${daily.count}/${goal}` : `0/${goal}`}</ProgressRing>
            <div className="text-[11px] text-muted-foreground mt-1">Daily goal</div>
          </div>
          <div className="hidden sm:block h-[80px] w-px bg-border" />
          <div className="space-y-1">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Level {level}</div>
            <div className="text-xl font-semibold tracking-tight">{env.gamification.xp} XP</div>
            <div className="w-[160px] h-1.5 rounded-full bg-muted overflow-hidden relative">
              <div className="absolute inset-y-0 left-0 w-full bg-foreground origin-left" style={{ transform: `scaleX(${pct / 100})` }} />
            </div>
            <div className="text-[11px] text-muted-foreground">{Math.round(pct)}% to next level</div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Stat label="Today" value={`${todayAttempts.length} words`} sub={`${Math.round(todayAcc)}% accuracy`} />
        <Stat label="Total practiced" value={`${totalPracticed} / ${WORDS.length}`} sub={`${attempts.length} attempts`} />
        <Stat label="Streak" value={`🔥 ${env.streak.current} days`} sub={`Longest ${env.streak.longest}`} />
        <Stat label="Mastered" value={`${mastered}`} sub={`${weak} weak words`} />
        <Stat label="Practice time" value={`${practiceMins} min`} sub={`${Math.round(totalMs / 1000)}s total`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="dash-card lg:col-span-2 hover:shadow-sm transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Weakest words</CardTitle>
              <Link to="/mistakes" onClick={() => ui.softClick()} className="text-xs text-muted-foreground hover:text-foreground transition">View all →</Link>
            </div>
          </CardHeader>
          <CardContent>
            {weakest.length === 0 ? (
              <div className="py-10 text-center">
                <div className="mx-auto h-10 w-10 rounded-full bg-muted grid place-items-center">✦</div>
                <p className="mt-3 text-sm font-medium">No weaknesses yet</p>
                <p className="text-xs text-muted-foreground">Start practicing — we’ll surface what needs work.</p>
                <Link to="/practice" onClick={() => ui.pop()}><Button size="sm" className="mt-3">Start practice</Button></Link>
              </div>
            ) : (
              <div className="divide-y">
                {weakest.map(p => {
                  const w = WORDS.find(x => x.id === p.wordId)
                  return (
                    <Link key={p.wordId} to={`/words?search=${encodeURIComponent(w?.word ?? "")}`} onClick={() => ui.softClick()} className="flex items-center justify-between py-3 hover:bg-muted/50 -mx-2 px-2 rounded-md transition active:scale-[0.99]">
                      <div>
                        <div className="text-sm font-medium tracking-tight">{w?.word}</div>
                        <div className="text-xs text-muted-foreground">{w?.category} • {p.attempts} attempts</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold tabular-nums">{Math.round((p.correct / p.attempts) * 100)}%</div>
                        <Badge className="mt-0.5 text-[10px] border bg-amber-50 text-amber-700 dark:bg-amber-950/30">Needs practice</Badge>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="dash-card hover:shadow-sm transition-shadow">
          <CardHeader className="pb-3"><CardTitle>Recent sessions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {recent.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No sessions yet.</p> : recent.map(s => (
              <div key={s.id} className="rounded-lg border bg-[hsl(var(--surface-2))] p-3 hover:border-foreground/10 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium capitalize">{s.mode}</span>
                  <span className="text-[11px] text-muted-foreground">{new Date(s.startedAt).toLocaleDateString()}</span>
                </div>
                <div className="mt-1 text-sm font-semibold">{s.correctCount}/{s.wordIds.length} • {s.wordIds.length ? Math.round((s.correctCount / s.wordIds.length) * 100) : 0}%</div>
                <div className="text-xs text-muted-foreground">{s.xpEarned} XP • {s.avgResponseMs ? `${s.avgResponseMs}ms avg` : ""}</div>
              </div>
            ))}
            <Link to="/statistics" onClick={() => ui.softClick()}><Button variant="outline" size="sm" className="w-full">View statistics</Button></Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-1 gap-3">
        <Link to="/practice?mode=listen" onClick={() => ui.pop()} className="quick-card rounded-xl border bg-card p-5 hover:bg-muted/40 hover:border-foreground/15 hover:shadow-sm hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.99] transition-all duration-200 will-change-transform flex items-center justify-between">
          <div>
            <div className="text-[15px] font-semibold tracking-tight">Listen & Type — IELTS Listening Spelling</div>
            <div className="text-xs text-muted-foreground mt-1">Hide word • Only audio • Type spelling — real exam simulation. Your spelling target.</div>
          </div>
          <span className="hidden sm:inline-flex h-8 w-8 rounded-full bg-foreground text-background grid place-items-center text-sm">→</span>
        </Link>
      </div>
    </div>
  )
}
