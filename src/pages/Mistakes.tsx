import { useMemo } from "react"
import { useAppStore } from "@/store/useAppStore"
import { WORDS } from "@/data/words"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Link } from "react-router-dom"
import { mistakeLabel, mistakeColor } from "@/services/mistakeAnalysis"

export default function Mistakes() {
  const env = useAppStore(s => s.envelope)
  if (!env) return null
  const attempts = [...env.attempts].reverse().filter(a => !a.isCorrect)
  const weakest = useMemo(() => {
    return Object.values(env.wordProgress)
      .filter(p => p.wrong > 0)
      .sort((a, b) => a.masteryScore - b.masteryScore || b.wrong - a.wrong)
      .slice(0, 12)
  }, [env.wordProgress])

  const breakdown = useMemo(() => {
    const m = new Map<string, number>()
    for (const a of env.attempts) if (!a.isCorrect && a.mistakeType) m.set(a.mistakeType, (m.get(a.mistakeType) || 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [env.attempts])

  return (
    <div className="max-w-[1120px] mx-auto px-4 lg:px-6 py-6 space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mistakes & Weaknesses</h1>
          <p className="text-sm text-muted-foreground">Your personal weakness engine — review what needs work.</p>
        </div>
        <Link to="/practice?mode=mistakes"><Button>Practice mistakes</Button></Link>
      </div>

      {weakest.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="mx-auto h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 grid place-items-center">✓</div>
          <p className="mt-3 font-medium">You haven’t made any spelling mistakes yet.</p>
          <p className="text-sm text-muted-foreground">Keep practicing — we’ll track every slip and surface it here.</p>
        </Card>
      ) : (
        <>
          <div className="grid md:grid-cols-3 gap-3">
            <Card className="p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Mistake types</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {breakdown.map(([k, v]) => (
                  <Badge key={k} className={`border ${mistakeColor(k as any)}`}>{mistakeLabel(k as any)}: {v}</Badge>
                ))}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Weak words</div>
              <div className="text-2xl font-semibold mt-1">{weakest.length}</div>
              <div className="text-xs text-muted-foreground">Need focused review</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Avg mistakes / session</div>
              <div className="text-2xl font-semibold mt-1">{env.sessions.length ? (attempts.length / env.sessions.length).toFixed(1) : "—"}</div>
              <div className="text-xs text-muted-foreground">{env.sessions.length} sessions</div>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Weakest words</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-3">
              {weakest.map(p => {
                const w = WORDS.find(x => x.id === p.wordId)
                const acc = Math.round((p.correct / p.attempts) * 100)
                return (
                  <div key={p.wordId} className="rounded-xl border p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium tracking-tight">{w?.word}</div>
                      <div className="text-xs text-muted-foreground">{w?.category} • {p.attempts} attempts • {p.wrong} mistakes</div>
                      <div className="mt-1 flex gap-1">
                        {p.lastMistakeType && <Badge className={`text-[10px] border ${mistakeColor(p.lastMistakeType)}`}>{mistakeLabel(p.lastMistakeType)}</Badge>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold tabular-nums">{acc}%</div>
                      <div className="text-[11px] text-muted-foreground">accuracy</div>
                      <Link to="/practice?mode=mistakes"><Button variant="outline" size="sm" className="mt-2 h-7 text-xs">Practice</Button></Link>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Recent mistakes</CardTitle></CardHeader>
            <CardContent className="divide-y">
              {attempts.slice(0, 20).map(a => {
                const w = WORDS.find(x => x.id === a.wordId)
                return (
                  <div key={a.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm"><span className="font-medium">{w?.word}</span> <span className="text-muted-foreground">— you typed</span> <span className="font-medium text-red-600">{a.typed}</span></div>
                      <div className="text-xs text-muted-foreground">{new Date(a.timestampISO).toLocaleString()} • {a.mode} • {a.responseMs}ms</div>
                    </div>
                    {a.mistakeType && <Badge className={`border text-[11px] ${mistakeColor(a.mistakeType)}`}>{mistakeLabel(a.mistakeType)}</Badge>}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
