import { useMemo, useState, useEffect, useRef } from "react"
import { CATEGORIES as SYSTEM_CATEGORIES } from "@/data/words"
import { useAppStore } from "@/store/useAppStore"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { tierColor } from "@/services/scoring"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useUiSound } from "@/hooks/useUiSound"
import { useAudio } from "@/hooks/useAudio"
import { getAllWords, findWordById, isDuplicateWord, addUserWord, updateUserWord, deleteUserWord, hideSystemWord, updateSystemWordPersonal, matchesSearch, getPersonalNoteForSystemWord } from "@/services/wordRepository"
import { getWordDictionaryData, generateSpellingTip, lookup, type DictionaryData } from "@/services/dictionaryService"
import { motion, AnimatePresence } from "framer-motion"

const MASTERY_FILTERS = ["all", "critical", "weak", "learning", "strong", "mastered", "untouched", "recentlyWrong"] as const
const SOURCE_FILTERS = ["all", "system", "my"] as const

function AddWordModal({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (id: string) => void }) {
  const [word, setWord] = useState("")
  const [banglaMeaning, setBanglaMeaning] = useState("")
  const [partOfSpeech, setPartOfSpeech] = useState("")
  const [pronunciation, setPronunciation] = useState("")
  const [example, setExample] = useState("")
  const [synonyms, setSynonyms] = useState("")
  const [antonyms, setAntonyms] = useState("")
  const [category, setCategory] = useState("My Words")
  const [personalNote, setPersonalNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = () => {
    setError(null)
    setSuccess(null)
    if (!word.trim()) { setError("Word is required."); return }
    const { exists, existing } = isDuplicateWord(word)
    if (exists) {
      setError(`This word is already in your vocabulary.`)
      if (existing) onAdded(existing.id)
      return
    }
    const res = addUserWord({
      word,
      banglaMeaning,
      partOfSpeech,
      pronunciation,
      example,
      synonyms: synonyms.split(",").map(s => s.trim()).filter(Boolean),
      antonyms: antonyms.split(",").map(s => s.trim()).filter(Boolean),
      category,
      personalNote,
    })
    if (res.isNew) {
      setSuccess(`✓ "${res.word.word}" added to your vocabulary`)
      setWord(""); setBanglaMeaning(""); setPartOfSpeech(""); setPronunciation(""); setExample(""); setSynonyms(""); setAntonyms(""); setPersonalNote("")
      setTimeout(() => { onClose(); onAdded(res.word.id) }, 700)
    }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ scale: 0.97, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="relative w-full max-w-[560px] max-h-[90vh] overflow-auto rounded-2xl border bg-card shadow-xl">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between">
          <h3 className="font-semibold tracking-tight">Add New Word</h3>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-full hover:bg-muted">✕</button>
        </div>
        <div className="p-6 space-y-3">
          <div>
            <label className="text-xs font-medium">Word *</label>
            <Input placeholder="e.g. resilient" value={word} onChange={e => setWord(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} className="mt-1" autoFocus />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="text-xs font-medium">Bangla Meaning</label><Input placeholder="স্থিতিস্থাপক" value={banglaMeaning} onChange={e => setBanglaMeaning(e.target.value)} className="mt-1" /></div>
            <div><label className="text-xs font-medium">Part of Speech</label><Input placeholder="adjective" value={partOfSpeech} onChange={e => setPartOfSpeech(e.target.value)} className="mt-1" /></div>
          </div>
          <div><label className="text-xs font-medium">Pronunciation</label><Input placeholder="/rɪˈzɪliənt/" value={pronunciation} onChange={e => setPronunciation(e.target.value)} className="mt-1" /></div>
          <div><label className="text-xs font-medium">Example Sentence</label><Input placeholder="Children are remarkably resilient..." value={example} onChange={e => setExample(e.target.value)} className="mt-1" /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="text-xs font-medium">Synonyms (comma separated)</label><Input placeholder="strong, tough" value={synonyms} onChange={e => setSynonyms(e.target.value)} className="mt-1" /></div>
            <div><label className="text-xs font-medium">Antonyms (comma separated)</label><Input placeholder="fragile, weak" value={antonyms} onChange={e => setAntonyms(e.target.value)} className="mt-1" /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="text-xs font-medium">Category</label><Input placeholder="My Words" value={category} onChange={e => setCategory(e.target.value)} className="mt-1" /></div>
            <div><label className="text-xs font-medium">Personal Note</label><Input placeholder="IELTS speaking use" value={personalNote} onChange={e => setPersonalNote(e.target.value)} className="mt-1" /></div>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          {success && <p className="text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 rounded-lg px-3 py-2">{success}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose} className="rounded-full">Cancel</Button>
            <Button onClick={handleSubmit} className="rounded-full">Add Word</Button>
          </div>
          <p className="text-[11px] text-muted-foreground text-center">Only Word is required. Others can be added later or auto-generated.</p>
        </div>
      </motion.div>
    </div>
  )
}

export default function Words() {
  const env = useAppStore(s => s.envelope)
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const ui = useUiSound()
  const { speak } = useAudio()
  const [search, setSearch] = useState(searchParams.get("search") ?? "")
  const [debounced, setDebounced] = useState(search)
  const [category, setCategory] = useState("all")
  const [mastery, setMastery] = useState<(typeof MASTERY_FILTERS)[number]>("all")
  const [source, setSource] = useState<(typeof SOURCE_FILTERS)[number]>("all")
  const [selected, setSelected] = useState<string | null>(searchParams.get("id") ?? null)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editNote, setEditNote] = useState("")
  const [fetchedDict, setFetchedDict] = useState<DictionaryData | null>(null)
  const [dictLoading, setDictLoading] = useState(false)

  const allWords = useMemo(() => getAllWords(), [env?.userWords, env?.hiddenWordIds])
  const categories = useMemo(() => {
    const cats = new Set([...SYSTEM_CATEGORIES, ...allWords.map(w => w.category)])
    return Array.from(cats).sort()
  }, [allWords])

  useEffect(() => { const id = searchParams.get("id"); if (id) setSelected(id) }, [searchParams])
  useEffect(() => { const t = setTimeout(() => setDebounced(search), 250); return () => clearTimeout(t) }, [search])
  useEffect(() => {
    if (!selWord) { setFetchedDict(null); setDictLoading(false); return }
    const hasLocal = !!(selWord.banglaMeaning || selWord.meaning || selWord.pronunciation || selWord.partOfSpeech || selWord.synonyms?.length)
    if (hasLocal) { setFetchedDict(null); setDictLoading(false); return }
    let cancelled = false
    setDictLoading(true)
    setFetchedDict(null)
    // safety timeout — never stay loading forever (user saw infinite loading)
    const t = setTimeout(() => { if (!cancelled) setDictLoading(false) }, 7500)
    lookup(selWord.word).then(data => {
      if (cancelled) return
      if (data.banglaMeaning || data.englishDefinition || data.pronunciation || data.partOfSpeech || data.synonyms?.length) {
        setFetchedDict(data)
      } else {
        setFetchedDict(null)
      }
    }).catch(() => { if (!cancelled) setFetchedDict(null) }).finally(() => {
      clearTimeout(t)
      if (!cancelled) setDictLoading(false)
    })
    return () => { cancelled = true; clearTimeout(t) }
  }, [selected])

  const filtered = useMemo(() => {
    return allWords.filter(w => {
      const p = env?.wordProgress[w.id]
      const personalNote = w.source === "system" ? getPersonalNoteForSystemWord(w.id) : w.personalNote
      if (!matchesSearch(w, debounced, personalNote)) return false
      if (category !== "all" && w.category !== category) return false
      if (source !== "all") {
        if (source === "system" && w.source !== "system" && w.source !== undefined) return false
        if (source === "my" && w.source !== "user") return false
      }
      if (mastery === "untouched") return !p || p.attempts === 0
      if (mastery === "recentlyWrong") return !!p && p.wrong > 0 && p.lastPracticedISO && Date.now() - new Date(p.lastPracticedISO).getTime() < 7 * 86400000
      if (mastery !== "all") {
        if (!p) return false
        return p.masteryTier === mastery
      }
      return true
    }).slice(0, 400)
  }, [allWords, debounced, category, mastery, source, env])

  const selWord = selected ? findWordById(selected) : null
  const selProg = selWord ? env?.wordProgress[selWord.id] : null
  const dict = selWord ? getWordDictionaryData(selWord) : null
  const spellTip = selWord ? generateSpellingTip(selWord) : null
  const personalNote = selWord ? (selWord.source === "system" ? getPersonalNoteForSystemWord(selWord.id) : selWord.personalNote) : undefined

  const handleAdded = (id: string) => {
    setSelected(id)
    setSearchParams({ id })
  }

  return (
    <div className="max-w-[1160px] mx-auto px-4 lg:px-6 py-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Word Library</h1>
          <p className="text-sm text-muted-foreground">{allWords.length} words • {SYSTEM_CATEGORIES.length} IELTS categories • Tap to learn</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { ui.pop(); setShowAdd(true) }} className="rounded-full shadow-sm">+ Add New Word</Button>
          <Link to="/learning" className="hidden sm:inline-flex"><Button variant="outline" className="rounded-full">Learning</Button></Link>
        </div>
      </div>

      <div className="mt-4 flex flex-col lg:flex-row gap-3">
        <div className="flex-1 flex gap-2">
          <Input placeholder="Search English, বাংলা, synonyms, notes..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-[420px]" />
          <select value={category} onChange={e => setCategory(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm hidden sm:block">
            <option value="all">All categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex gap-1 flex-wrap items-center">
          <span className="text-xs text-muted-foreground hidden lg:inline mr-1">Source:</span>
          {SOURCE_FILTERS.map(s => (
            <button key={s} onClick={() => { ui.softClick(); setSource(s)}} className={`px-2.5 py-1 rounded-full text-xs border capitalize ${source === s ? "bg-foreground text-background border-foreground" : "bg-card hover:bg-muted"}`}>{s === "my" ? "My Words" : s}</button>
          ))}
        </div>
      </div>
      <div className="mt-2 flex gap-1 flex-wrap">
        {MASTERY_FILTERS.map(m => (
          <button key={m} onClick={() => { ui.softClick(); setMastery(m)}} className={`px-2 py-1 rounded-full text-xs border capitalize ${mastery === m ? "bg-foreground text-background border-foreground" : "bg-card hover:bg-muted"}`}>{m}</button>
        ))}
      </div>

      <div className="mt-4 grid lg:grid-cols-[1fr_380px] gap-4 items-start">
        <div className="border rounded-xl bg-card overflow-hidden flex flex-col max-h-[70vh]">
          <div data-lenis-prevent className="flex-1 min-h-0 overflow-y-auto overscroll-contain divide-y scroll-smooth touch-pan-y" style={{ WebkitOverflowScrolling: "touch" } as any}>
            {filtered.map(w => {
              const p = env?.wordProgress[w.id]
              const acc = p && p.attempts ? Math.round((p.correct / p.attempts) * 100) : null
              const isUser = w.source === "user"
              const bangla = w.banglaMeaning
              return (
                <button
                  key={w.id}
                  onClick={() => { ui.softClick(); setSelected(w.id); setSearchParams({ id: w.id }) }}
                  className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-muted/50 active:bg-muted transition ${selected === w.id ? "bg-muted" : ""}`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate tracking-tight">{w.word}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${isUser ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300" : "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30"}`}>{isUser ? "MY WORD" : "IELTS"}</span>
                    </div>
                    {bangla ? <div className="text-xs text-emerald-700 dark:text-emerald-300 truncate">বাংলা: {bangla}</div> : null}
                    <div className="text-xs text-muted-foreground truncate">{w.category} • {w.difficulty}{w.partOfSpeech ? ` • ${w.partOfSpeech}` : ""} {acc !== null ? `• ${acc}%` : ""}</div>
                  </div>
                  <div className="shrink-0 ml-3 flex items-center gap-2">
                    {p ? <span className="text-xs tabular-nums">{p.attempts}×</span> : <span className="text-xs text-muted-foreground">new</span>}
                    <Badge className={`text-[10px] border ${p ? tierColor(p.masteryTier) : "bg-zinc-50 text-zinc-600"}`}>{p ? p.masteryTier : "new"}</Badge>
                  </div>
                </button>
              )
            })}
            {filtered.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No words match. Try searching বাংলা or English.</div>}
            {filtered.length >= 400 && <div className="p-3 text-center text-xs text-muted-foreground border-t bg-muted/30">Showing first 400 — refine search.</div>}
          </div>
        </div>

        <div className="lg:sticky lg:top-[80px] h-fit">
          {!selWord ? (
            <Card className="p-8 text-center">
              <div className="mx-auto h-10 w-10 rounded-full bg-muted grid place-items-center">◎</div>
              <p className="mt-3 text-sm font-medium">Select a word</p>
              <p className="text-xs text-muted-foreground">See dictionary, Bangla, progress and practice.</p>
              <Button size="sm" className="mt-4 rounded-full" onClick={() => setShowAdd(true)}>+ Add New Word</Button>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              {/* Header — dictionary */}
              <div className="p-5 border-b bg-[hsl(var(--surface-2))]">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xl font-[750] tracking-tight uppercase">{selWord.word}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {(dict?.pronunciation || fetchedDict?.pronunciation) && <span className="text-xs font-mono text-muted-foreground">{dict?.pronunciation || fetchedDict?.pronunciation}</span>}
                      {selWord.pronunciation && !dict?.pronunciation && !fetchedDict?.pronunciation && <span className="text-xs font-mono text-muted-foreground">{selWord.pronunciation}</span>}
                      {(selWord.partOfSpeech || fetchedDict?.partOfSpeech) && <Badge className="text-[10px] border bg-card">{selWord.partOfSpeech || fetchedDict?.partOfSpeech}</Badge>}
                      <Badge className={`text-[10px] border ${selWord.source === "user" ? "bg-amber-100 text-amber-800" : "bg-sky-50 text-sky-700"}`}>{selWord.source === "user" ? "MY WORD" : "IELTS"}</Badge>
                      {dictLoading && <span className="text-[10px] text-muted-foreground animate-pulse">loading…</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full" onClick={() => speak(selWord.word, false)} aria-label="Listen"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.08"/></svg></Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full" onClick={() => speak(selWord.word, true)} aria-label="Slow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4z"/><path d="M15.54 8.46a5 5 0 1 1 0 7.07"/></svg></Button>
                  </div>
                </div>
                {/* Bangla first — with loading & smooth animation */}
                <AnimatePresence mode="wait">
                  <motion.div key={selWord.id + "-dict"} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}>
                    {dictLoading ? (
                      <div className="mt-4 rounded-xl border bg-card p-3 space-y-2">
                        <div className="h-3 w-20 rounded bg-muted shimmer" />
                        <div className="h-4 w-full rounded bg-muted shimmer" />
                        <div className="h-3 w-3/4 rounded bg-muted shimmer" />
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl border bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 p-3">
                        <p className="text-[11px] tracking-wide uppercase font-[600] text-amber-800 dark:text-amber-300">বাংলা অর্থ</p>
                        {(selWord.banglaMeaning || fetchedDict?.banglaMeaning) ? (
                          <p className="mt-1 text-sm font-medium text-amber-900 dark:text-amber-100">{selWord.banglaMeaning || fetchedDict?.banglaMeaning}</p>
                        ) : (
                          <p className="mt-1 text-xs text-muted-foreground">Dictionary information isn't available yet. <button onClick={() => setEditing(true)} className="underline">Add information</button></p>
                        )}
                        {(fetchedDict?.englishDefinition || dict?.englishDefinition) && <p className="mt-2 text-xs text-muted-foreground"><span className="font-medium text-foreground">English:</span> {fetchedDict?.englishDefinition || dict?.englishDefinition}</p>}
                        {selWord.meaning && !dict?.englishDefinition && !fetchedDict?.englishDefinition && <p className="mt-2 text-xs text-muted-foreground"><span className="font-medium text-foreground">English:</span> {selWord.meaning}</p>}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
                <AnimatePresence mode="wait">
                  {dictLoading ? (
                    <motion.div key="loading-example" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-3 rounded-xl border bg-card p-3">
                      <div className="h-3 w-16 rounded bg-muted shimmer mb-2" />
                      <div className="h-3 w-full rounded bg-muted shimmer" />
                    </motion.div>
                  ) : (selWord.example || fetchedDict?.example) ? (
                    <motion.div key="example" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 rounded-xl border bg-card p-3">
                      <p className="text-[11px] tracking-wide uppercase text-muted-foreground">Example</p>
                      <p className="mt-1 text-sm italic">"{selWord.example || fetchedDict?.example}"</p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
                <AnimatePresence>
                  {(selWord.synonyms?.length || selWord.antonyms?.length || fetchedDict?.synonyms?.length) && !dictLoading && (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 space-y-2">
                      {selWord.synonyms?.length ? <div><p className="text-[11px] tracking-wide uppercase text-muted-foreground">Synonyms</p><div className="mt-1 flex flex-wrap gap-1">{selWord.synonyms.map(s => <button key={s} onClick={() => { const f = findWordById(s.toLowerCase()) || getAllWords().find(w => w.word.toLowerCase() === s.toLowerCase()); if(f) { setSelected(f.id); setSearchParams({id:f.id}) } }} className="px-2 py-1 rounded-full border bg-card hover:bg-muted text-xs">{s}</button>)}</div></div> : null}
                      {fetchedDict?.synonyms?.length && !selWord.synonyms?.length ? <div><p className="text-[11px] tracking-wide uppercase text-muted-foreground">Synonyms</p><div className="mt-1 flex flex-wrap gap-1">{fetchedDict.synonyms.map(s => <button key={s} onClick={() => { const f = findWordById(s.toLowerCase()) || getAllWords().find(w => w.word.toLowerCase() === s.toLowerCase()); if(f) { setSelected(f.id); setSearchParams({id:f.id}) } }} className="px-2 py-1 rounded-full border bg-card hover:bg-muted text-xs">{s}</button>)}</div></div> : null}
                      {selWord.antonyms?.length ? <div><p className="text-[11px] tracking-wide uppercase text-muted-foreground">Antonyms</p><div className="mt-1 flex flex-wrap gap-1">{selWord.antonyms.map(s => <button key={s} onClick={() => { const f = getAllWords().find(w => w.word.toLowerCase() === s.toLowerCase()); if(f) { setSelected(f.id); setSearchParams({id:f.id}) } }} className="px-2 py-1 rounded-full border bg-card hover:bg-muted text-xs">{s}</button>)}</div></div> : null}
                    </motion.div>
                  )}
                </AnimatePresence>
                {spellTip && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-xl border bg-sky-50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-900 p-3">
                    <p className="text-[11px] tracking-wide uppercase font-[600] text-sky-700 dark:text-sky-300">Spelling Tip</p>
                    <p className="mt-1 text-sm font-mono">{spellTip}</p>
                  </motion.div>
                )}

              </div>

              <div className="p-5 space-y-4">
                {/* Personal learning */}
                {selProg ? (
                  <div className="rounded-xl border bg-card p-3">
                    <p className="text-[11px] tracking-wide uppercase font-[600]">Your Progress</p>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg border p-2"><div className="text-sm font-semibold">{selProg.accuracy.toFixed(0)}%</div><div className="text-[11px] text-muted-foreground">Accuracy</div></div>
                      <div className="rounded-lg border p-2"><div className="text-sm font-semibold">{selProg.masteryScore}%</div><div className="text-[11px] text-muted-foreground">Mastery</div></div>
                      <div className="rounded-lg border p-2"><div className="text-sm font-semibold capitalize">{selProg.state}</div><div className="text-[11px] text-muted-foreground">Status</div></div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground space-y-1">
                      <div>Attempts {selProg.attempts} • Correct {selProg.correct} • Wrong {selProg.wrong}</div>
                      <div>Last practiced: {selProg.lastPracticedISO ? new Date(selProg.lastPracticedISO).toLocaleDateString() : "—"}</div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border p-3 text-center">
                    <p className="text-xs font-medium">Not practiced yet</p>
                    <p className="text-[11px] text-muted-foreground">UNSEEN • Start learning</p>
                  </div>
                )}

                {personalNote && (
                  <div className="rounded-xl border bg-amber-50 dark:bg-amber-950/10 p-3">
                    <p className="text-[11px] tracking-wide uppercase font-[600]">Personal Note</p>
                    <p className="mt-1 text-sm">{personalNote}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" className="rounded-full" onClick={() => navigate(`/practice?word=${selWord.id}`)}>Practice</Button>
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => navigate(`/learning?word=${selWord.id}`)}>Learn</Button>
                  <Button size="sm" variant="ghost" className="rounded-full border" onClick={() => speak(selWord.word, false)}>Listen</Button>
                  <Button size="sm" variant="ghost" className="rounded-full border" onClick={() => speak(selWord.word, true)}>Slow</Button>
                </div>

                <div className="flex gap-2">
                  {selWord.source === "user" ? (
                    <>
                      <Button size="sm" variant="outline" className="flex-1 rounded-full" onClick={() => setEditing(true)}>Edit</Button>
                      <Button size="sm" variant="outline" className="rounded-full text-red-600 border-red-200" onClick={() => { if(confirm("Delete this word?")) { deleteUserWord(selWord.id); setSelected(null) } }}>Delete</Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" className="flex-1 rounded-full" onClick={() => { const note = prompt("Personal note:", personalNote || ""); if(note !== null) { updateSystemWordPersonal(selWord.id, { personalNote: note }); setEditing(false) } }}>Add Note</Button>
                      <Button size="sm" variant="ghost" className="rounded-full text-muted-foreground" onClick={() => { hideSystemWord(selWord.id); setSelected(null) }}>Hide</Button>
                    </>
                  )}
                </div>

                {!editing ? null : (
                  <div className="rounded-xl border p-3 space-y-2 bg-muted/30">
                    <p className="text-xs font-medium">Edit {selWord.source === "user" ? "Word" : "Personal Note"}</p>
                    {selWord.source === "user" ? (
                      <>
                        <Input placeholder="Bangla Meaning" defaultValue={selWord.banglaMeaning} id="edit-bangla" />
                        <Input placeholder="Example" defaultValue={selWord.example} id="edit-example" />
                        <div className="flex gap-2">
                          <Button size="sm" className="rounded-full" onClick={() => {
                            const b = (document.getElementById("edit-bangla") as HTMLInputElement)?.value
                            const e = (document.getElementById("edit-example") as HTMLInputElement)?.value
                            updateUserWord(selWord.id, { banglaMeaning: b, example: e }); setEditing(false)
                          }}>Save</Button>
                          <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setEditing(false)}>Cancel</Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <Input placeholder="Personal note" defaultValue={personalNote} id="edit-note" />
                        <div className="flex gap-2">
                          <Button size="sm" className="rounded-full" onClick={() => {
                            const v = (document.getElementById("edit-note") as HTMLInputElement)?.value || ""
                            updateSystemWordPersonal(selWord.id, { personalNote: v }); setEditing(false)
                          }}>Save</Button>
                          <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setEditing(false)}>Cancel</Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      <AddWordModal open={showAdd} onClose={() => setShowAdd(false)} onAdded={handleAdded} />
    </div>
  )
}


