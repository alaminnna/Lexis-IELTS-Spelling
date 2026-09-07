import { Link } from "react-router-dom"
import { Button } from "@/components/ui/Button"
import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { useEffect } from "react"
import { motion, useReducedMotion } from "framer-motion"

function useSeo() {
  useEffect(() => {
    document.title = "Lexis — Master IELTS Spelling, One Word at a Time"
    const ensureMeta = (name: string, content: string, isProperty = false) => {
      const sel = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`
      let el = document.querySelector(sel) as HTMLMetaElement | null
      if (!el) {
        el = document.createElement("meta")
        if (isProperty) el.setAttribute("property", name)
        else el.setAttribute("name", name)
        document.head.appendChild(el)
      }
      el.setAttribute("content", content)
    }
    ensureMeta("description", "Master difficult IELTS vocabulary spelling through focused learning, active recall, and adaptive practice. Learn → Recall → Practice → Improve. Local-first and private.")
    ensureMeta("og:title", "Lexis — Master IELTS Spelling, One Word at a Time", true)
    ensureMeta("og:description", "Learn difficult IELTS words, break them into chunks, hear pronunciation, and practice until you recall them correctly. Adaptive review brings weak words back.", true)
    ensureMeta("og:type", "website", true)
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
    if (!link) {
      link = document.createElement("link")
      link.rel = "canonical"
      document.head.appendChild(link)
    }
    link.href = window.location.origin + "/"
    // dashboard meta should not inherit — reset when landing unmounts
    return () => {}
  }, [])
}

function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="max-w-[1160px] mx-auto px-4 lg:px-6 h-[64px] flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-md bg-foreground text-background grid place-items-center text-[12px] font-bold">Lx</div>
          <div>
            <div className="text-[13px] font-semibold tracking-[-0.015em] leading-none">Lexis</div>
            <div className="text-[11px] text-muted-foreground tracking-wide">IELTS Spelling</div>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-[13px]">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition">Dashboard</Link>
          <Link to="/learning" className="text-muted-foreground hover:text-foreground transition">Learning</Link>
          <Link to="/practice" className="text-muted-foreground hover:text-foreground transition">Practice</Link>
          <Link to="/about" className="text-muted-foreground hover:text-foreground transition">About</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/dashboard" className="hidden sm:inline-flex"><Button variant="outline" className="rounded-full h-9">Dashboard</Button></Link>
          <Link to="/learning"><Button className="rounded-full h-9">Start Learning</Button></Link>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  const reduce = useReducedMotion()
  return (
    <section className="relative overflow-hidden border-b">
      <div className="absolute inset-0 bg-[hsl(var(--surface-2))] -z-10" />
      <div className="absolute inset-0 -z-10 opacity-[0.04]" style={{ background: "radial-gradient(600px 400px at 70% 20%, hsl(var(--foreground)), transparent)" }} />
      <div className="max-w-[1160px] mx-auto px-4 lg:px-6 py-14 lg:py-20 grid lg:grid-cols-[1.1fr_0.9fr] gap-8 items-center">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="min-w-0"
        >
          <Badge className="border bg-card">IELTS • Spelling • Recall</Badge>
          <h1 className="mt-4 text-[34px] lg:text-[48px] font-semibold tracking-[-0.04em] leading-[0.95] max-w-[560px]">
            Master IELTS spelling.
            <span className="block text-muted-foreground">One word at a time.</span>
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground max-w-[540px]">
            Knowing a word is not the same as recalling its spelling. Lexis helps you learn difficult IELTS vocabulary, hear pronunciation, break words into chunks, and practice until you can type them correctly — every time.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/learning"><Button size="lg" className="rounded-full h-11 px-6">Start Learning</Button></Link>
            <Link to="/practice"><Button variant="outline" size="lg" className="rounded-full h-11 px-6">Practice Now</Button></Link>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">Local-first • Your progress stays in this browser • No account required</p>
          <div className="mt-6 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> 884 IELTS words</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-sky-500" /> 36 categories</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Adaptive review</span>
          </div>
        </motion.div>

        {/* Preview mock — product UI example, clearly demo */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="relative lg:pl-6"
        >
          <div className="rounded-[20px] border bg-card shadow-sm overflow-hidden">
            <div className="h-10 flex items-center justify-between px-4 border-b bg-[hsl(var(--surface-2))] text-[11px] tracking-wide text-muted-foreground">
              <span>Learning • accommodation</span>
              <span className="px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 dark:bg-amber-950/30 text-[10px]">Example UI</span>
            </div>
            <div className="p-6 text-center">
              <div className="text-[11px] tracking-wide uppercase text-muted-foreground">Spelling pattern</div>
              <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
                <span className="px-2.5 py-1.5 rounded-lg border bg-[hsl(var(--surface-2))] font-semibold text-sm">ACCOM</span>
                <span className="px-2.5 py-1.5 rounded-lg border bg-foreground text-background font-semibold text-sm">MM</span>
                <span className="px-2.5 py-1.5 rounded-lg border bg-[hsl(var(--surface-2))] font-semibold text-sm">ODATION</span>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">Remember double <span className="font-medium text-foreground">MM</span> — write it as two.</div>
              <div className="mt-5 rounded-xl border bg-[hsl(var(--surface-2))] p-3 text-left">
                <div className="text-[11px] tracking-wide uppercase text-muted-foreground">Active recall</div>
                <div className="mt-2 flex gap-2">
                  <div className="flex-1 h-9 rounded-full border bg-card grid place-items-center text-sm text-muted-foreground">Type what you hear…</div>
                  <div className="h-9 px-4 rounded-full bg-foreground text-background grid place-items-center text-sm font-medium">Check</div>
                </div>
              </div>
              <div className="mt-3 flex justify-center gap-2 text-[10px]">
                <span className="px-2 py-1 rounded-full border bg-emerald-50 text-emerald-700">Correct +8</span>
                <span className="px-2 py-1 rounded-full border bg-sky-50 text-sky-700">Next review in 3 days</span>
              </div>
            </div>
            <div className="px-4 py-3 border-t bg-[hsl(var(--surface-2))] flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Your progress drives the order</span>
              <span className="font-medium">Adaptive</span>
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">Example interface — not your personal data.</p>
        </motion.div>
      </div>
    </section>
  )
}

function WhySection() {
  const reduce = useReducedMotion()
  return (
    <section className="max-w-[1160px] mx-auto px-4 lg:px-6 py-12 lg:py-16">
      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <div>
          <p className="text-[11px] tracking-[0.14em] uppercase text-muted-foreground">Why spelling matters</p>
          <h2 className="mt-2 text-[26px] lg:text-[32px] font-semibold tracking-[-0.03em] leading-none max-w-[480px]">Recognition is not recall.</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground max-w-[520px]">
            You can recognize <em className="text-foreground not-italic">accommodation</em> and still misspell it as <em className="text-foreground not-italic">accomodation</em> under listening pressure. IELTS listening rewards accuracy — one letter decides the answer.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { k: "Recognition", v: "You know the meaning when you see it.", c: "border-sky-200 bg-sky-50 dark:bg-sky-950/20" },
            { k: "Recall", v: "You can produce the spelling from sound.", c: "border-amber-200 bg-amber-50 dark:bg-amber-950/20" },
            { k: "Accuracy", v: "One missing letter still counts as wrong.", c: "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20" },
            { k: "Retention", v: "Strong words fade without review.", c: "border-violet-200 bg-violet-50 dark:bg-violet-950/20" },
          ].map((x, i) => (
            <motion.div
              key={x.k}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              className={`rounded-xl border p-4 ${x.c}`}
            >
              <div className="text-sm font-semibold">{x.k}</div>
              <div className="mt-1 text-xs text-muted-foreground leading-relaxed">{x.v}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const reduce = useReducedMotion()
  const steps = [
    { n: "01", t: "Learn", d: "See spelling, hear pronunciation, break into chunks.", a: "Accommodation → ACCOM • MM • ODATION" },
    { n: "02", t: "Recall", d: "Hide the spelling and type from memory.", a: "Type what you hear…" },
    { n: "03", t: "Practice", d: "Check instantly, see exact mistake type.", a: "Missing letter • Repeated letter • Vowel" },
    { n: "04", t: "Review", d: "Weak words return sooner, strong words later.", a: "Next review in 1 → 3 → 7 → 14 days" },
    { n: "05", t: "Improve", d: "Accuracy, mastery and review spacing grow.", a: "0–39 Critical → 95–100 Mastered" },
  ]
  return (
    <section className="border-y bg-[hsl(var(--surface-2))]">
      <div className="max-w-[1160px] mx-auto px-4 lg:px-6 py-12 lg:py-16">
        <p className="text-[11px] tracking-[0.14em] uppercase text-muted-foreground">How it works</p>
        <h2 className="mt-2 text-[26px] lg:text-[32px] font-semibold tracking-[-0.03em]">Learn → Recall → Practice → Review → Improve</h2>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.07 }}
              className="rounded-xl border bg-card p-4 flex flex-col"
            >
              <span className="text-[10px] tracking-wide text-muted-foreground">{s.n}</span>
              <span className="mt-1 text-sm font-semibold">{s.t}</span>
              <span className="mt-1 text-xs text-muted-foreground leading-relaxed flex-1">{s.d}</span>
              <span className="mt-3 inline-flex text-[11px] px-2 py-1 rounded-full border bg-muted">{s.a}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function LearningPractice() {
  return (
    <section className="max-w-[1160px] mx-auto px-4 lg:px-6 py-12 lg:py-16 grid lg:grid-cols-2 gap-6">
      <Card className="overflow-hidden hover:shadow-sm transition-shadow">
        <div className="h-1 bg-foreground" />
        <CardContent className="p-6">
          <p className="text-[11px] tracking-[0.14em] uppercase text-muted-foreground">Learning system</p>
          <h3 className="mt-2 text-[20px] font-semibold tracking-tight">Understand the word before you test it.</h3>
          <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground list-disc pl-4">
            <li>Hear pronunciation and slow playback</li>
            <li>See spelling broken into memorable chunks</li>
            <li>Get a spelling tip for double letters and suffixes</li>
            <li>Recall actively — type the spelling from memory</li>
            <li>Identify where you went wrong with precise feedback</li>
          </ul>
          <Link to="/learning" className="inline-flex mt-5"><Button className="rounded-full">Start Learning</Button></Link>
        </CardContent>
      </Card>
      <Card className="overflow-hidden hover:shadow-sm transition-shadow">
        <div className="h-1 bg-[hsl(var(--accent))]" />
        <CardContent className="p-6">
          <p className="text-[11px] tracking-[0.14em] uppercase text-muted-foreground">Practice system</p>
          <h3 className="mt-2 text-[20px] font-semibold tracking-tight">Test spelling the way IELTS does.</h3>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {["Listen", "Type", "Check", "Feedback", "Improve"].map((x, i) => (
              <span key={x} className="inline-flex items-center gap-1.5 text-xs">
                <span className="h-6 w-6 rounded-full border bg-card grid place-items-center text-[11px] font-medium">{i + 1}</span> {x}
                {i < 4 && <span className="text-muted-foreground">→</span>}
              </span>
            ))}
          </div>
          <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground list-disc pl-4">
            <li>Listen & Type — spelling hidden, only audio</li>
            <li>Immediate correct/wrong animation + mistake type</li>
            <li>Keyboard-first: Enter to check, Space to play, R slow, N next, Esc exit</li>
          </ul>
          <Link to="/practice" className="inline-flex mt-5"><Button variant="outline" className="rounded-full">Practice Now</Button></Link>
        </CardContent>
      </Card>
    </section>
  )
}

function AdaptiveSection() {
  const reduce = useReducedMotion()
  return (
    <section className="border-y bg-[hsl(var(--surface-2))]">
      <div className="max-w-[1160px] mx-auto px-4 lg:px-6 py-12 lg:py-16 grid lg:grid-cols-2 gap-8 items-center">
        <div>
          <p className="text-[11px] tracking-[0.14em] uppercase text-muted-foreground">Adaptive learning</p>
          <h2 className="mt-2 text-[26px] lg:text-[32px] font-semibold tracking-[-0.03em] leading-none">Your mistakes shape what comes next.</h2>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-[520px]">
            Lexis tracks how you perform on each word — wrong frequency, accuracy, recency, streak — and surfaces weak words more often. Strong words appear less, mastered words stay dormant until review is due.
          </p>
          <div className="mt-6 space-y-2 text-sm">
            <div className="flex items-center gap-3"><span className="h-7 w-7 rounded-full bg-red-50 border border-red-200 text-red-700 grid place-items-center text-xs">!</span> Recent mistake → shown within hours</div>
            <div className="flex items-center gap-3"><span className="h-7 w-7 rounded-full bg-amber-50 border border-amber-200 text-amber-700 grid place-items-center text-xs">↻</span> Long gap → boosted for review</div>
            <div className="flex items-center gap-3"><span className="h-7 w-7 rounded-full bg-violet-50 border border-violet-200 text-violet-700 grid place-items-center text-xs">✓</span> Mastered 95–100 → maintenance only</div>
          </div>
        </div>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-[16px] border bg-card p-4 shadow-sm"
        >
          <div className="text-[11px] tracking-wide uppercase text-muted-foreground">Example — next word priority</div>
          <div className="mt-3 space-y-2">
            {[
              { w: "accommodation", m: "Weak • 32% • 3 wrong", s: "Priority high — repeated letter", c: "bg-red-50 border-red-200 text-red-700" },
              { w: "environment", m: "Learning • 68% • 1 wrong", s: "+12 gap 9 days", c: "bg-amber-50 border-amber-200 text-amber-700" },
              { w: "business", m: "Mastered • 97% • 0 wrong", s: "Maintenance — low priority", c: "bg-zinc-50 border-zinc-200 text-muted-foreground" },
            ].map(r => (
              <div key={r.w} className="flex items-center justify-between rounded-xl border bg-[hsl(var(--surface-2))] px-3 py-3">
                <div>
                  <div className="text-sm font-medium">{r.w}</div>
                  <div className="text-xs text-muted-foreground">{r.m}</div>
                </div>
                <span className={`text-[11px] px-2 py-1 rounded-full border ${r.c}`}>{r.s}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground text-center">Product illustration — not technical detail.</p>
        </motion.div>
      </div>
    </section>
  )
}

function ProgressSection() {
  return (
    <section className="max-w-[1160px] mx-auto px-4 lg:px-6 py-12 lg:py-16">
      <div className="grid lg:grid-cols-2 gap-8 items-center">
        <div className="order-2 lg:order-1 rounded-[16px] border bg-card p-4 shadow-sm">
          <div className="text-[11px] tracking-wide uppercase text-muted-foreground">Progress — example dashboard</div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { k: "Words Learned", v: "48", sub: "of 884" },
              { k: "Needs Review", v: "12", sub: "weak" },
              { k: "Accuracy", v: "82%", sub: "last 30" },
            ].map(x => (
              <div key={x.k} className="rounded-xl border bg-[hsl(var(--surface-2))] p-3 text-center">
                <div className="text-lg font-semibold">{x.v}</div>
                <div className="text-[11px] text-muted-foreground">{x.k}</div>
                <div className="text-[10px] text-muted-foreground">{x.sub}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-5 gap-1">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className={`h-6 rounded border ${i % 5 === 2 ? "bg-foreground border-foreground" : i % 3 === 0 ? "bg-amber-200 border-amber-300" : "bg-muted"}`} />
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground text-center">Preview of mastery distribution & review queue. Example values.</p>
        </div>
        <div className="order-1 lg:order-2">
          <p className="text-[11px] tracking-[0.14em] uppercase text-muted-foreground">Progress & mastery</p>
          <h2 className="mt-2 text-[26px] lg:text-[32px] font-semibold tracking-[-0.03em]">See where you stand — and what needs you.</h2>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-[520px]">
            Your dashboard shows words learned, weak words, accuracy over time, streak and mastery distribution — all derived from your actual attempts. Zero-state is honest: before you practice, it says you haven't practiced yet.
          </p>
          <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground list-disc pl-4">
            <li>Words Learned vs Needs Review</li>
            <li>Mastery: Critical 0–39 → Mastered 95–100</li>
            <li>Next review spacing: 1 → 3 → 7 → 14 → 30 days</li>
          </ul>
        </div>
      </div>
    </section>
  )
}

function FeatureGrid() {
  const features = [
    { t: "IELTS-focused vocabulary", d: "884 words curated for IELTS listening, across 36 categories." },
    { t: "Active spelling recall", d: "Type from sound, not multiple choice — real exam pressure." },
    { t: "Pronunciation support", d: "Hear the word, replay, slow playback when needed." },
    { t: "Spelling breakdown", d: "Chunks and tips highlight double letters and suffixes." },
    { t: "Smart review", d: "Weak words surface more; strong words wait." },
    { t: "Adaptive learning", d: "Your mistakes and timing shape future order." },
    { t: "Mistake tracking", d: "Missing, extra, transposition, vowel — know why you missed." },
    { t: "Progress tracking", d: "Accuracy, mastery, streak and review heatmap from real data." },
  ]
  return (
    <section className="border-y bg-[hsl(var(--surface-2))]">
      <div className="max-w-[1160px] mx-auto px-4 lg:px-6 py-12 lg:py-16">
        <p className="text-[11px] tracking-[0.14em] uppercase text-muted-foreground">Features</p>
        <h2 className="mt-2 text-[26px] lg:text-[32px] font-semibold tracking-[-0.03em]">Everything you need — nothing you don't.</h2>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {features.map(f => (
            <div key={f.t} className="rounded-xl border bg-card p-4">
              <div className="text-sm font-semibold">{f.t}</div>
              <div className="mt-1 text-xs text-muted-foreground leading-relaxed">{f.d}</div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] text-muted-foreground">All listed features are implemented in the application. No marketed feature is unavailable.</p>
      </div>
    </section>
  )
}

function MetaSection() {
  return (
    <section className="max-w-[640px] mx-auto px-4 lg:px-6 py-12 lg:py-16 text-center">
      <p className="text-[11px] tracking-[0.14em] uppercase text-muted-foreground">Learn how you learn</p>
      <h2 className="mt-2 text-[26px] lg:text-[32px] font-semibold tracking-[-0.03em]">The system notices where you struggle.</h2>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        When a word is hard for you, Lexis remembers — and which learning method helped you recall it. Next time, it favors the method and timing that worked, and brings the word back just before you would forget.
      </p>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="max-w-[1160px] mx-auto px-4 lg:px-6 pb-12 lg:pb-16">
      <div className="rounded-[20px] border bg-foreground text-background p-8 lg:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-[22px] lg:text-[28px] font-semibold tracking-[-0.03em]">Ready to improve your IELTS spelling?</h2>
          <p className="mt-2 text-sm text-background/70 max-w-[520px]">Start learning words that actually need your attention. Your progress stays in this browser.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/learning"><Button variant="secondary" size="lg" className="rounded-full bg-background text-foreground hover:bg-background/90">Start Learning</Button></Link>
          <Link to="/practice"><Button variant="outline" size="lg" className="rounded-full border-background/20 text-background hover:bg-background hover:text-foreground">Practice Now</Button></Link>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t">
      <div className="max-w-[1160px] mx-auto px-4 lg:px-6 py-8 grid md:grid-cols-3 gap-6 text-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-foreground text-background grid place-items-center text-[10px] font-bold">Lx</div>
            <span className="font-semibold tracking-tight">Lexis</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground max-w-[260px]">Premium IELTS spelling trainer — local-first, private, offline-capable.</p>
        </div>
        <div className="flex gap-8 text-xs">
          <div className="space-y-2">
            <div className="font-medium">Product</div>
            <Link to="/learning" className="block text-muted-foreground hover:text-foreground">Learning</Link>
            <Link to="/practice" className="block text-muted-foreground hover:text-foreground">Practice</Link>
            <Link to="/dashboard" className="block text-muted-foreground hover:text-foreground">Dashboard</Link>
            <Link to="/about" className="block text-muted-foreground hover:text-foreground">About — Al A Min</Link>
          </div>
          <div className="space-y-2">
            <div className="font-medium">Data</div>
            <Link to="/words" className="block text-muted-foreground hover:text-foreground">Words</Link>
            <Link to="/statistics" className="block text-muted-foreground hover:text-foreground">Statistics</Link>
            <Link to="/settings" className="block text-muted-foreground hover:text-foreground">Settings</Link>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} Lexis • IELTS Spelling • Local-first</div>
          <div className="mt-1">No account required. Your data never leaves this browser.</div>
          <div className="mt-2 flex gap-3">
            <a href="https://www.facebook.com/profile.php?id=61578789046935" target="_blank" rel="noreferrer" className="underline hover:text-foreground">Facebook</a>
            <a href="https://www.instagram.com/alaminnna" target="_blank" rel="noreferrer" className="underline hover:text-foreground">Instagram</a>
            <a href="https://github.com/alaminnna" target="_blank" rel="noreferrer" className="underline hover:text-foreground">GitHub</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default function Landing() {
  useSeo()
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <PublicHeader />
      <main>
        <Hero />
        <WhySection />
        <HowItWorks />
        <LearningPractice />
        <AdaptiveSection />
        <ProgressSection />
        <MetaSection />
        <FeatureGrid />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
