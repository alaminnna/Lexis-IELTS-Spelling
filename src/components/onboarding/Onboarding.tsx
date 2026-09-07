import { useState } from "react"
import { useAppStore } from "@/store/useAppStore"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"

export function Onboarding() {
  const completeOnboarding = useAppStore(s => s.completeOnboarding)
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError("Please enter your name")
      return
    }
    if (trimmed.length > 60) {
      setError("Name must be 60 characters or less")
      return
    }
    setError(null)
    setLoading(true)
    try {
      await completeOnboarding(trimmed)
    } catch (err: any) {
      setError(err?.message ?? "Could not save name")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] grid place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-[440px]">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 rounded-lg bg-foreground text-background grid place-items-center text-sm font-bold">Lx</div>
          <h1 className="mt-4 text-[22px] font-semibold tracking-tight">Welcome to IELTS Spelling Trainer</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Personal, local-first. Your progress stays in this browser.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 rounded-2xl border bg-card p-6 shadow-sm space-y-4">
          <div>
            <label htmlFor="onb-name" className="text-sm font-medium">What&apos;s your name?</label>
            <Input
              id="onb-name"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              maxLength={60}
              className="mt-1.5"
              autoComplete="name"
            />
            {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
            <p className="mt-1.5 text-[11px] text-muted-foreground">Only your name — no email, password or account needed.</p>
          </div>

          <Button type="submit" disabled={loading || !name.trim()} className="w-full rounded-full h-10">
            {loading ? "Saving..." : "Continue"}
          </Button>
        </form>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Your name is stored locally and can be changed anytime in Settings.
        </p>
      </div>
    </div>
  )
}
