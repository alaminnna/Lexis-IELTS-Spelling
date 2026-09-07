import { WORDS as SYSTEM_WORDS } from "@/data/words"
import type { Word } from "@/types/word"
import { useAppStore } from "@/store/useAppStore"

function normalize(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, " ")
}
function slugify(s: string) {
  return normalize(s).replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-") || `w-${Date.now()}`
}

function sanitizeText(input?: string): string | undefined {
  if (!input) return undefined
  let s = input
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "")
  s = s.replace(/<style[\s\S]*?<\/style>/gi, "")
  s = s.replace(/<!--[\s\S]*?-->/g, "")
  s = s.replace(/<[^>]*>/g, " ")
  s = s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  s = s.replace(/\s+/g, " ").trim()
  // detect polluted ad/script remnants
  const lower = s.toLowerCase()
  if (lower.includes("adsbygoogle") || lower.includes("data-ad-status") || lower.includes("google-auto-ads") || lower.includes("window.datalayer") || lower.includes("gtag(") || lower.includes("english-bangla.com") && s.includes("Tariff")) {
    // for Bangla meaning, if it contains Tariff and is long, it's polluted
    if (s.length > 120 || lower.includes("tariff") || lower.includes("adsbygoogle")) return undefined
  }
  if (s.length > 600) s = s.slice(0, 600)
  if (!s || s.length < 2) return undefined
  // if it looks like a title with " - Bengali Meaning", extract first word
  if (s.includes(" - Bengali Meaning") || s.includes(" শব্দের বাংলা অর্থ")) {
    const first = s.split(" - ")[0].split(" | ")[0].trim()
    if (first && first.length < 30 && /^[a-zA-Z\s-]+$/.test(first)) return first
  }
  return s
}
function sanitizeWord(w: Word): Word {
  const cleaned: Word = { ...w }
  const cleanWord = sanitizeText(w.word)
  if (cleanWord && cleanWord !== w.word) {
    // polluted title like "advanced - Bengali Meaning..." -> clean to "advanced"
    cleaned.word = cleanWord
    cleaned.normalized = normalize(cleanWord)
  } else if (cleanWord && cleanWord.toLowerCase().includes("bengali meaning")) {
    cleaned.word = w.word.split(" ")[0]
    cleaned.normalized = normalize(cleaned.word)
  }
  cleaned.banglaMeaning = sanitizeText(w.banglaMeaning)
  cleaned.meaning = sanitizeText(w.meaning)
  cleaned.example = sanitizeText(w.example)
  cleaned.pronunciation = sanitizeText(w.pronunciation)
  cleaned.partOfSpeech = sanitizeText(w.partOfSpeech)
  cleaned.personalNote = sanitizeText(w.personalNote)
  cleaned.spellingTip = sanitizeText(w.spellingTip)
  if (w.synonyms) {
    const cleanSyn = w.synonyms.map(s => sanitizeText(s)).filter(Boolean) as string[]
    // filter out polluted entries like "অভিধান", "Words", "Bangla Academy" that are not synonyms
    const filtered = cleanSyn.filter(s => s.length >= 2 && s.length <= 30 && !["অভিধান", "Words", "Bangla Academy", "English", "IELTS"].includes(s))
    cleaned.synonyms = filtered.length ? filtered : undefined
  }
  if (w.antonyms) {
    const cleanAnt = w.antonyms.map(s => sanitizeText(s)).filter(Boolean) as string[]
    cleaned.antonyms = cleanAnt.length ? cleanAnt : undefined
  }
  // category should not be polluted
  if (w.category && w.category.length > 40) cleaned.category = "My Words"
  return cleaned
}

// All words = system + user, filtered by hidden, sanitized
export function getAllWords(): Word[] {
  const env = useAppStore.getState().envelope
  const userWords: Word[] = (env?.userWords ?? []).map(sanitizeWord)
  const hidden = new Set(env?.hiddenWordIds ?? [])
  const system = SYSTEM_WORDS.map(w => ({ ...w, source: "system" as const, hidden: hidden.has(w.id) } as Word)).filter(w => !hidden.has(w.id))
  const users = userWords.filter(w => !hidden.has(w.id))
  return [...system, ...users]
}

export function findWordById(id: string): Word | undefined {
  return getAllWords().find(w => w.id === id)
}
export function findWordByNormalized(norm: string): Word | undefined {
  const n = normalize(norm)
  return getAllWords().find(w => w.normalized === n)
}

export function isDuplicateWord(input: string): { exists: boolean; existing?: Word } {
  const existing = findWordByNormalized(input)
  return { exists: !!existing, existing }
}

export function addUserWord(data: Partial<Word> & { word: string }): { word: Word; isNew: boolean; existing?: Word } {
  const rawInput = data.word.trim()
  // sanitize raw word first (extract clean word if polluted title)
  const sanitizedRaw = sanitizeText(rawInput)?.split(" ")[0] || rawInput.split(" ")[0]
  const raw = sanitizedRaw
  const normalized = normalize(raw)
  const dup = isDuplicateWord(raw)
  if (dup.exists) return { word: dup.existing!, isNew: false, existing: dup.existing! }

  const now = new Date().toISOString()
  const id = slugify(normalized)
  let finalId = id
  let counter = 1
  while (getAllWords().some(w => w.id === finalId)) {
    finalId = `${id}-${counter++}`
  }
  const word: Word = {
    id: finalId,
    word: raw,
    normalized,
    category: sanitizeText(data.category) || "My Words",
    categorySlug: slugify(sanitizeText(data.category) || "My Words"),
    difficulty: (data.difficulty as any) || "medium",
    source: "user",
    banglaMeaning: sanitizeText(data.banglaMeaning),
    meaning: sanitizeText(data.meaning),
    partOfSpeech: sanitizeText(data.partOfSpeech),
    pronunciation: sanitizeText(data.pronunciation),
    example: sanitizeText(data.example),
    synonyms: data.synonyms && data.synonyms.length ? (data.synonyms.map(s => sanitizeText(s)).filter(Boolean) as string[]) : undefined,
    antonyms: data.antonyms && data.antonyms.length ? (data.antonyms.map(s => sanitizeText(s)).filter(Boolean) as string[]) : undefined,
    personalNote: sanitizeText(data.personalNote),
    audioUrl: sanitizeText(data.audioUrl),
    spellingTip: sanitizeText(data.spellingTip),
    createdAt: now,
    updatedAt: now,
  }

  const env = useAppStore.getState().envelope!
  env.userWords = [...(env.userWords ?? []), word]
  // init progress for adaptive engine
  if (!env.wordProgress[word.id]) {
    // will be created lazily via ensureProgress
  }
  useAppStore.setState({ envelope: { ...env } })
  void useAppStore.getState().persist()
  return { word, isNew: true }
}

export function updateUserWord(id: string, patch: Partial<Word>): Word | null {
  const env = useAppStore.getState().envelope!
  const idx = env.userWords.findIndex(w => w.id === id)
  if (idx === -1) {
    // system word: cannot overwrite source, but allow personalNote and hidden
    // For system word personal fields, store as user overlay? For now, only allow personalNote via patch on system? We store overlay in userWords as shadow? Simpler: if system word, create a user overlay entry? But spec says allow personal note for system words without overwriting source.
    // We'll store personalNote in a separate map? For simplicity, allow editing system word's personalNote by creating a user word entry that shadows? Easier: store personalNote directly on a hidden map in envelope? For now, we allow updating system word's personal fields by storing in userWords as an extension with same id but source system? Instead, we just update if found as system hidden? For now, return null and let caller handle.
    return null
  }
  const existing = env.userWords[idx]
  const updated: Word = { ...existing, ...patch, word: patch.word?.trim() ? patch.word.trim() : existing.word, normalized: patch.word ? normalize(patch.word) : existing.normalized, updatedAt: new Date().toISOString() }
  // re-slug category if changed
  if (patch.category) updated.categorySlug = slugify(patch.category)
  env.userWords[idx] = updated
  useAppStore.setState({ envelope: { ...env } })
  void useAppStore.getState().persist()
  return updated
}

export function updateSystemWordPersonal(id: string, patch: Pick<Word, "personalNote">): void {
  // store personalNote for system word in a dedicated map within userWords as overlay with id = system id + suffix? Simpler: store in envelope as userWords with same id but source system and only personalNote
  const env = useAppStore.getState().envelope!
  // find existing overlay
  let overlay = env.userWords.find(w => w.id === `overlay-${id}`)
  if (!overlay) {
    overlay = { id: `overlay-${id}`, word: id, normalized: id, category: "overlay", categorySlug: "overlay", difficulty: "medium", source: "system", personalNote: patch.personalNote, createdAt: new Date().toISOString() } as Word
    env.userWords.push(overlay)
  } else {
    overlay.personalNote = patch.personalNote
    overlay.updatedAt = new Date().toISOString()
  }
  useAppStore.setState({ envelope: { ...env } })
  void useAppStore.getState().persist()
}
export function getPersonalNoteForSystemWord(id: string): string | undefined {
  const env = useAppStore.getState().envelope
  const overlay = env?.userWords.find(w => w.id === `overlay-${id}`)
  return overlay?.personalNote
}

export function deleteUserWord(id: string): boolean {
  const env = useAppStore.getState().envelope!
  const before = env.userWords.length
  env.userWords = env.userWords.filter(w => w.id !== id)
  // also remove progress? Keep progress for history but not needed. We keep it.
  useAppStore.setState({ envelope: { ...env } })
  void useAppStore.getState().persist()
  return env.userWords.length < before
}

export function hideSystemWord(id: string) {
  const env = useAppStore.getState().envelope!
  if (!env.hiddenWordIds.includes(id)) {
    env.hiddenWordIds.push(id)
    useAppStore.setState({ envelope: { ...env } })
    void useAppStore.getState().persist()
  }
}
export function unhideWord(id: string) {
  const env = useAppStore.getState().envelope!
  env.hiddenWordIds = env.hiddenWordIds.filter(x => x !== id)
  useAppStore.setState({ envelope: { ...env } })
  void useAppStore.getState().persist()
}

// helper for search across Bangla etc
export function matchesSearch(word: Word, query: string, personalNote?: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    word.word.toLowerCase().includes(q) ||
    word.normalized.includes(q) ||
    (word.banglaMeaning?.toLowerCase().includes(q) ?? false) ||
    (word.meaning?.toLowerCase().includes(q) ?? false) ||
    word.category.toLowerCase().includes(q) ||
    (word.synonyms?.some(s => s.toLowerCase().includes(q)) ?? false) ||
    (word.antonyms?.some(s => s.toLowerCase().includes(q)) ?? false) ||
    (personalNote?.toLowerCase().includes(q) ?? false)
  )
}
