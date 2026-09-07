import { useAppStore } from "@/store/useAppStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Dialog } from "@/components/ui/Dialog"
import { useState } from "react"

export default function Settings() {
  const env = useAppStore(s => s.envelope)
  const updateSettings = useAppStore(s => s.updateSettings)
  const updateUserProfile = useAppStore(s => s.updateUserProfile)
  const clearProgress = useAppStore(s => s.clearProgress)
  const clearAllData = useAppStore(s => s.clearAllData)
  const exportJson = useAppStore(s => s.exportJson)
  const importJson = useAppStore(s => s.importJson)
  const [msg, setMsg] = useState<string | null>(null)
  const [profileName, setProfileName] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [showClearProgressDialog, setShowClearProgressDialog] = useState(false)
  const [showClearAllDialog, setShowClearAllDialog] = useState(false)

  if (!env) return null
  const s = env.settings
  const profile = env.userProfile
  const currentName = profileName !== null ? profileName : profile.name

  const handleExport = () => {
    const json = exportJson()
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `lexis-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async () => {
    try {
      const fileInput = document.createElement("input")
      fileInput.type = "file"
      fileInput.accept = ".json"
      fileInput.onchange = async () => {
        const file = fileInput.files?.[0]
        if (!file) return
        const text = await file.text()
        await importJson(text)
        setMsg("Import successful — progress restored.")
        setTimeout(() => setMsg(null), 3000)
      }
      fileInput.click()
    } catch (e: any) { setMsg(e.message) }
  }

  const handleSaveProfile = async () => {
    const trimmed = currentName.trim()
    if (!trimmed) { setProfileError("Name is required"); return }
    if (trimmed.length > 60) { setProfileError("Name must be 60 characters or less"); return }
    setProfileError(null)
    try {
      await updateUserProfile({ name: trimmed })
      setProfileName(null)
      setMsg("Name updated.")
      setTimeout(() => setMsg(null), 2000)
    } catch (e: any) { setProfileError(e.message) }
  }

  const handleClearProgress = async () => {
    await clearProgress()
    setShowClearProgressDialog(false)
    setMsg("Practice progress cleared. Your custom words and settings were kept.")
    setTimeout(() => setMsg(null), 3000)
  }

  const handleClearAll = async () => {
    await clearAllData()
    setShowClearAllDialog(false)
    setMsg("All data cleared. Please enter your name to continue.")
    setTimeout(() => setMsg(null), 3000)
  }

  return (
    <div className="max-w-[760px] mx-auto px-4 lg:px-6 py-6 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      {msg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">{msg}</div>}

      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs font-medium">Your name</label>
            <div className="mt-1 flex gap-2">
              <Input
                value={currentName}
                onChange={e => { setProfileName(e.target.value); setProfileError(null) }}
                placeholder="Your name"
                maxLength={60}
                className="flex-1"
                onKeyDown={e => e.key === "Enter" && handleSaveProfile()}
              />
              <Button onClick={handleSaveProfile} className="rounded-full" size="sm">Save</Button>
            </div>
            {profileError && <p className="mt-1 text-xs text-red-600">{profileError}</p>}
            <p className="mt-1.5 text-[11px] text-muted-foreground">This name appears on your Dashboard and is stored locally. Changes appear immediately.</p>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Created {new Date(profile.createdAt).toLocaleDateString()} {profile.updatedAt ? `• Updated ${new Date(profile.updatedAt).toLocaleDateString()}` : ""}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          {(["light", "dark", "system"] as const).map(t => (
            <button key={t} onClick={() => updateSettings({ theme: t })} className={`px-3 py-1.5 rounded-full border text-sm capitalize ${s.theme === t ? "bg-foreground text-background border-foreground" : "bg-card hover:bg-muted"}`}>{t}</button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Audio</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between">
            <span className="text-sm">Sound enabled</span>
            <input type="checkbox" checked={s.soundEnabled} onChange={e => updateSettings({ soundEnabled: e.target.checked })} className="h-4 w-4" />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">Volume {Math.round(s.volume * 100)}%</span>
            <input type="range" min={0} max={1} step={0.05} value={s.volume} onChange={e => updateSettings({ volume: parseFloat(e.target.value) })} className="w-40" />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">Auto-play pronunciation</span>
            <input type="checkbox" checked={s.autoPlay} onChange={e => updateSettings({ autoPlay: e.target.checked })} className="h-4 w-4" />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">Slow pronunciation default</span>
            <input type="checkbox" checked={s.slowRate} onChange={e => updateSettings({ slowRate: e.target.checked })} className="h-4 w-4" />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Practice</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between">
            <span className="text-sm">Daily goal</span>
            <div className="flex items-center gap-2">
              <select value={[10,20,30,50,100].includes(s.dailyGoal) ? s.dailyGoal : 999} onChange={e => { const v=parseInt(e.target.value); if(v!==999) updateSettings({dailyGoal:v})}} className="h-9 rounded-md border bg-background px-3 text-sm">
                {[10, 20, 30, 50, 100].map(n => <option key={n} value={n}>{n} words</option>)}
                <option value={999}>Custom…</option>
              </select>
              <input type="number" min={5} max={200} value={s.dailyGoal} onChange={e => updateSettings({dailyGoal: Math.max(5, Math.min(200, parseInt(e.target.value)||30))})} className="h-9 w-20 rounded-md border bg-background px-2 text-sm" />
            </div>
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">Default mode</span>
            <select value={s.defaultMode} onChange={e => updateSettings({ defaultMode: e.target.value as any })} className="h-9 rounded-md border bg-background px-3 text-sm">
              <option value="listen">Listen & Type — spelling target</option>
              <option value="smart">Smart (adaptive)</option>
              <option value="normal">Normal</option>
              <option value="random">Random</option>
              <option value="mistakes">Mistakes</option>
              <option value="weak">Weak words</option>
              <option value="quick10">Quick 10</option>
              <option value="challenge50">Challenge 50</option>
            </select>
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">Session length</span>
            <select value={s.sessionLength} onChange={e => updateSettings({ sessionLength: parseInt(e.target.value) })} className="h-9 rounded-md border bg-background px-3 text-sm">
              {[10, 20, 30, 50].map(n => <option key={n} value={n}>{n} words</option>)}
            </select>
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">Adaptive review</span>
            <input type="checkbox" checked={s.adaptiveEnabled} onChange={e => updateSettings({ adaptiveEnabled: e.target.checked })} className="h-4 w-4" />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Keyboard shortcuts</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 text-sm">
          <div><kbd className="px-1.5 py-0.5 rounded border bg-muted text-xs">Enter</kbd> Submit / Next</div>
          <div><kbd className="px-1.5 py-0.5 rounded border bg-muted text-xs">Space</kbd> Play pronunciation</div>
          <div><kbd className="px-1.5 py-0.5 rounded border bg-muted text-xs">R</kbd> Slow pronunciation</div>
          <div><kbd className="px-1.5 py-0.5 rounded border bg-muted text-xs">N</kbd> Next word</div>
          <div><kbd className="px-1.5 py-0.5 rounded border bg-muted text-xs">Esc</kbd> Exit practice</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Data & Privacy</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleExport} variant="outline" className="rounded-full">Export Progress</Button>
            <Button variant="outline" onClick={handleImport} className="rounded-full">Import Progress</Button>
          </div>
          <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
            <h4 className="text-sm font-medium">Clear Practice Progress</h4>
            <p className="text-xs text-muted-foreground">Removes practice history, attempts, streak, word statistics and daily progress. Keeps your name, custom words and settings.</p>
            <Button variant="outline" className="rounded-full border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-300" onClick={() => setShowClearProgressDialog(true)}>Clear Practice Progress</Button>
          </div>
          <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 p-4 space-y-3">
            <h4 className="text-sm font-medium text-red-700 dark:text-red-300">Reset Everything</h4>
            <p className="text-xs text-muted-foreground">Permanently deletes your name, practice history, custom words, learning progress, streak and settings. You will be asked for your name again.</p>
            <Button variant="outline" className="rounded-full text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground" onClick={() => setShowClearAllDialog(true)}>Clear All App Data</Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showClearProgressDialog} onClose={() => setShowClearProgressDialog(false)}>
        <h3 className="text-base font-semibold">Clear practice progress?</h3>
        <p className="mt-2 text-sm text-muted-foreground">This will permanently remove your practice history and progress. Your name, custom words and settings will be kept.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" className="rounded-full" onClick={() => setShowClearProgressDialog(false)}>Cancel</Button>
          <Button className="rounded-full bg-amber-600 hover:bg-amber-700 text-white" onClick={handleClearProgress}>Clear Progress</Button>
        </div>
      </Dialog>

      <Dialog open={showClearAllDialog} onClose={() => setShowClearAllDialog(false)}>
        <h3 className="text-base font-semibold text-red-600">Clear all app data?</h3>
        <p className="mt-2 text-sm text-muted-foreground">This cannot be undone. This will delete your name, onboarding state, practice history, learning progress, custom words, streak, adaptive engine state and settings.</p>
        <p className="mt-2 text-xs font-medium text-red-600">This cannot be undone.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" className="rounded-full" onClick={() => setShowClearAllDialog(false)}>Cancel</Button>
          <Button className="rounded-full bg-red-600 hover:bg-red-700 text-white" onClick={handleClearAll}>Clear All Data</Button>
        </div>
      </Dialog>
    </div>
  )
}
