import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import { useAppStore } from "@/store/useAppStore"
import { cn } from "@/utils/cn"
import { Button } from "@/components/ui/Button"
import { useEffect, useState, useRef } from "react"
import { SmoothScroll } from "@/components/effects/SmoothScroll"
import { uiSound } from "@/services/uiSound"
import gsap from "gsap"
import { Onboarding } from "@/components/onboarding/Onboarding"
import { useStorageSync } from "@/hooks/useStorageSync"

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: "◧" },
  { to: "/practice", label: "Practice", icon: "◆" },
  { to: "/learning", label: "Learning", icon: "◯" },
  { to: "/mistakes", label: "Mistakes", icon: "◎" },
  { to: "/words", label: "Words", icon: "▤" },
  { to: "/statistics", label: "Statistics", icon: "▦" },
  { to: "/settings", label: "Settings", icon: "⬢" },
  { to: "/about", label: "About", icon: "✦" },
]

function Sidebar() {
  const { envelope } = useAppStore()
  const daily = (() => {
    if (!envelope) return null
    const d = new Date()
    const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
    return envelope.dailyProgress[today]
  })()
  const goal = envelope?.settings.dailyGoal ?? 30
  const count = daily?.count ?? 0
  const pct = Math.min(100, (count / goal) * 100)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!barRef.current) return
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReduced) { barRef.current.style.transform = `scaleX(${pct/100})`; return }
    gsap.to(barRef.current, { scaleX: pct / 100, duration: 0.9, ease: "power3.out", overwrite: true })
  }, [pct])

  return (
    <aside className="hidden lg:flex w-[260px] shrink-0 flex-col border-r bg-[hsl(var(--surface-2))] sticky top-0 h-[100dvh]">
      <div className="h-[64px] flex items-center px-6 border-b">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-md bg-[hsl(var(--foreground))] text-[hsl(var(--background))] grid place-items-center text-[12px] font-bold">Lx</div>
          <div>
            <div className="text-[13px] font-semibold tracking-[-0.015em] leading-none">Lexis</div>
            <div className="text-[11px] text-muted-foreground tracking-wide">IELTS Spelling</div>
          </div>
        </div>
      </div>

      <nav className="p-3 flex-1 space-y-1">
        {nav.map(n => (
          <NavLink
            key={n.to}
            to={n.to}
            onClick={() => uiSound.nav()}
            onMouseEnter={() => {
              const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
              if (!prefersReduced) uiSound.hover()
            }}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-[13.5px] font-[450] transition-all duration-150 cursor-pointer",
                isActive
                  ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))] shadow-sm"
                  : "text-muted-foreground hover:bg-[hsl(var(--surface-3))] hover:text-foreground hover:translate-x-[1px] active:scale-[0.99]"
              )
            }
          >
            <span className="text-[11px] w-4 text-center opacity-70">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t space-y-3">
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium">Daily goal</span>
            <span className="text-[11px] tabular-nums text-muted-foreground">{count} / {goal}</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden relative">
            <div ref={barRef} className="absolute inset-y-0 left-0 w-full bg-[hsl(var(--accent))] origin-left" style={{ transform: `scaleX(${pct/100})` }} />
          </div>
          <p className="mt-1.5 text-[11px] leading-none text-muted-foreground">{count >= goal ? "Goal reached — nice work." : `${goal - count} more to goal`}</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Local-first • {envelope?.wordProgress ? Object.keys(envelope.wordProgress).length : 0} words tracked
        </div>
      </div>
    </aside>
  )
}

function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open || !panelRef.current) return
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReduced) return
    gsap.fromTo(panelRef.current, { x: "-100%", opacity: 0.9 }, { x: "0%", opacity: 1, duration: 0.38, ease: "power3.out" })
    gsap.fromTo(panelRef.current.querySelectorAll("a"), { x: -8, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, stagger: 0.04, ease: "power2.out", delay: 0.12 })
  }, [open])

  if (!open) return null
  return (
    <div className="lg:hidden fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { uiSound.softClick(); onClose() }} />
      <div ref={panelRef} className="absolute left-0 top-0 h-full w-[84%] max-w-[320px] bg-card border-r p-4 flex flex-col shadow-xl">
        <div className="flex items-center justify-between">
          <span className="font-semibold tracking-tight">Lexis</span>
          <Button variant="ghost" size="sm" onClick={() => { uiSound.softClick(); onClose() }} aria-label="Close">✕</Button>
        </div>
        <nav className="mt-6 space-y-1">
          {nav.map(n => (
            <NavLink key={n.to} to={n.to} onClick={() => { uiSound.nav(); onClose() }} className={({ isActive }) => cn("flex items-center gap-3 rounded-md px-3 py-2.5 text-[14px] transition", isActive ? "bg-foreground text-background" : "hover:bg-muted active:scale-[0.99]")}>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const isPractice = location.pathname.startsWith("/practice")
  return (
    <header className="h-[56px] lg:h-[64px] sticky top-0 z-30 bg-[hsl(var(--background))/80] backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--background))/70] border-b flex items-center px-4 lg:px-6 gap-3">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => { uiSound.softClick(); onMenu() }} aria-label="Menu">
        <span className="text-lg">☰</span>
      </Button>
      <div className="flex-1 flex items-center gap-3">
        <span className="lg:hidden flex items-center gap-2 font-semibold tracking-tight"><span className="h-6 w-6 rounded bg-foreground text-background grid place-items-center text-[10px]">Lx</span> Lexis</span>
        <span className="hidden lg:block text-[12px] tracking-wide text-muted-foreground uppercase">{titleFor(location.pathname)}</span>
      </div>
      {!isPractice && (
        <Button size="sm" onClick={() => { uiSound.pop(); navigate("/practice") }} className="hidden sm:inline-flex">Start practice</Button>
      )}
    </header>
  )
}

function titleFor(path: string) {
  if (path === "/dashboard" || path.startsWith("/dashboard")) return "Dashboard"
  if (path.startsWith("/practice")) return "Practice"
  if (path.startsWith("/learning")) return "Learning"
  if (path.startsWith("/mistakes")) return "Mistakes"
  if (path.startsWith("/words")) return "Words"
  if (path.startsWith("/statistics")) return "Statistics"
  if (path.startsWith("/settings")) return "Settings"
  if (path.startsWith("/about")) return "About"
  return ""
}

export function AppShell() {
  const [open, setOpen] = useState(false)
  const { ready, init } = useAppStore()
  const envelope = useAppStore(s => s.envelope)
  const storageError = useAppStore(s => s.storageError)
  const location = useLocation()
  const mainRef = useRef<HTMLDivElement>(null)
  const [needRefresh, setNeedRefresh] = useState(false)

  useEffect(() => { if (!ready) void init() }, [ready, init])
  useStorageSync()

  // PWA update prompt — listen for waiting service worker
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return
    let reg: ServiceWorkerRegistration | undefined
    const onUpdate = () => setNeedRefresh(true)
    navigator.serviceWorker.getRegistration().then(r => {
      reg = r
      if (r?.waiting) setNeedRefresh(true)
      r?.addEventListener("updatefound", () => {
        const sw = r.installing
        sw?.addEventListener("statechange", () => {
          if (sw.state === "installed" && navigator.serviceWorker.controller) setNeedRefresh(true)
        })
      })
    })
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload())
    return () => {}
  }, [])

  // GSAP page transition — buttery, respects reduced motion
  useEffect(() => {
    if (!mainRef.current) return
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReduced) return
    const el = mainRef.current
    gsap.fromTo(el, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.42, ease: "power3.out", overwrite: true })
  }, [location.pathname])

  useEffect(() => {
    // init uiSound with current settings once ready
    if (!ready) return
    const env = useAppStore.getState().envelope
    if (env) uiSound.init(env.settings.volume, env.settings.soundEnabled)
  }, [ready])

  // Global premium click sound — ensures *every* interactive click has beautiful feedback (Bengali request)
  useEffect(() => {
    if (!ready) return
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Skip if already handled by Button component (it plays its own sound at capture phase)
      // Button plays in its onClick handler which runs before this document listener (bubble)
      // So to avoid double, check if closest button has our primary Button class? For now, skip plain <button> that already had explicit ui calls
      // Instead, play only for elements that look interactive but aren't <button> with our sound
      const isButton = target.closest("button")
      const isLink = target.closest("a")
      const isInteractive = target.closest('[role="button"], [data-sound="pop"]')
      // If it's a Button, trust its internal handler already played click — skip
      if (isButton) return
      // For links and generic interactive, play soft pop
      if (isLink || isInteractive) {
        const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        // Don't overdo: only if not reduced and sound enabled
        const env = useAppStore.getState().envelope
        if (env?.settings.soundEnabled && !prefersReduced) uiSound.softClick()
      }
    }
    document.addEventListener("click", onClick)
    return () => document.removeEventListener("click", onClick)
  }, [ready])

  if (!ready) {
    return (
      <div className="min-h-[100dvh] grid place-items-center bg-background">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 rounded-full border-2 border-muted border-t-foreground animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading Lexis…</p>
        </div>
      </div>
    )
  }

  // First-time onboarding gate per prompt §2, §26 — must be after ready
  // About is public even inside app — bypass onboarding so nav bar never disappears
  const isPublicRoute = location.pathname.startsWith("/about")
  const needsOnboarding = !envelope?.userProfile?.onboardingCompleted && !isPublicRoute
  if (needsOnboarding) {
    return (
      <>
        {storageError && (
          <div className="sticky top-0 z-50 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900 px-4 py-2 text-xs text-amber-800 dark:text-amber-200 text-center">
            {storageError}
          </div>
        )}
        <Onboarding />
      </>
    )
  }

  return (
    <SmoothScroll>
      <div className="min-h-[100dvh] flex bg-background text-foreground overflow-x-clip">
        <Sidebar />
        <MobileNav open={open} onClose={() => setOpen(false)} />
        <div className="flex-1 min-w-0 flex flex-col">
          <Topbar onMenu={() => setOpen(true)} />
          {storageError && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900 px-4 py-2 text-xs text-amber-800 dark:text-amber-200">
              {storageError}
            </div>
          )}
          {needRefresh && (
            <div className="bg-sky-50 dark:bg-sky-950/30 border-b border-sky-200 dark:border-sky-900 px-4 py-2 flex items-center justify-between text-xs">
              <span className="text-sky-800 dark:text-sky-200">New version available.</span>
              <Button size="sm" className="h-7 rounded-full" onClick={() => window.location.reload()}>Refresh</Button>
            </div>
          )}
          <main ref={mainRef} className="flex-1 min-w-0 will-change-transform">
            <Outlet />
          </main>
          <footer className="border-t py-4 px-6 text-[11px] text-muted-foreground flex items-center justify-between">
            <span>Lexis • Premium IELTS Spelling • Local-first</span>
            <span className="hidden sm:inline">Press <kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px]">?</kbd> for shortcuts</span>
          </footer>
        </div>
      </div>
    </SmoothScroll>
  )
}
