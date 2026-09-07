import { openDB, type DBSchema } from "idb"
import type { StorageEnvelope } from "@/types/progress"
import { WORDS } from "@/data/words"
import { createDefaultMeta } from "./metaLearning"
import { DB_NAME, STORE, KEY, LS_KEY, STORAGE_VERSION, BROADCAST_CHANNEL } from "@/storage/storageKeys"

interface AppDB extends DBSchema {
  app: { key: string; value: StorageEnvelope }
}

export function defaultEnvelope(): StorageEnvelope {
  return {
    version: STORAGE_VERSION,
    exportedAt: new Date().toISOString(),
    wordsMeta: { count: WORDS.length, sourceHash: "d858b220ce03" },
    userProfile: { id: "local-user", name: "", onboardingCompleted: false, createdAt: new Date().toISOString(), updatedAt: null },
    wordProgress: {},
    attempts: [],
    sessions: [],
    streak: { current: 0, longest: 0, lastPracticeDateISO: null, practiceDays: 0, totalSessions: 0, history: [] },
    gamification: { xp: 0, level: 1, achievements: [], personalBests: { bestAccuracy: 0, bestStreak: 0, fastestAvgMs: null } },
    settings: {
      theme: "system",
      soundEnabled: true,
      volume: 0.72,
      autoPlay: true,
      slowRate: false,
      dailyGoal: 30,
      defaultMode: "smart",
      adaptiveEnabled: true,
      sessionLength: 20,
    },
    dailyProgress: {},
    userWords: [],
    hiddenWordIds: [],
    metaLearning: createDefaultMeta(),
    activeLearningSession: null,
  }
}

function simpleSanitize(input?: string): string | undefined {
  if (!input) return undefined
  let s = input.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
  const low = s.toLowerCase()
  if (low.includes("adsbygoogle") || low.includes("data-ad-status") || (low.includes("english-bangla.com") && low.includes("tariff"))) {
    if (s.length > 80) return undefined
  }
  if (s.includes(" - Bengali Meaning") || s.includes(" শব্দের বাংলা অর্থ")) {
    const first = s.split(" - ")[0].split(" | ")[0].trim()
    if (first && first.length < 30) return first
  }
  if (s.length > 500) s = s.slice(0, 500)
  return s && s.length >= 2 ? s : undefined
}
export function sanitizeName(input: string): string {
  // strip HTML and trim, cap 60
  let s = input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
  if (s.length > 60) s = s.slice(0, 60)
  return s
}

function migrateEnvelope(env: any): StorageEnvelope {
  if (!env.userProfile) {
    // back-compat: try legacy profile field
    const legacy = env.profile as any
    if (legacy && typeof legacy.name === "string") {
      env.userProfile = {
        id: legacy.id ?? "local-user",
        name: sanitizeName(legacy.name) ?? "",
        onboardingCompleted: !!legacy.onboardingCompleted || !!legacy.name?.trim(),
        createdAt: legacy.createdAt ?? new Date().toISOString(),
        updatedAt: legacy.updatedAt ?? null,
      }
    } else {
      env.userProfile = { id: "local-user", name: "", onboardingCompleted: false, createdAt: new Date().toISOString(), updatedAt: null }
    }
  } else {
    // ensure fields
    if (typeof env.userProfile.name !== "string") env.userProfile.name = ""
    env.userProfile.name = sanitizeName(env.userProfile.name)
    if (typeof env.userProfile.onboardingCompleted !== "boolean") env.userProfile.onboardingCompleted = !!env.userProfile.name.trim()
    if (!env.userProfile.id) env.userProfile.id = "local-user"
    if (!env.userProfile.createdAt) env.userProfile.createdAt = new Date().toISOString()
    if (env.userProfile.updatedAt === undefined) env.userProfile.updatedAt = null
    // if name exists but onboarding not set, mark completed
    if (env.userProfile.name.trim() && !env.userProfile.onboardingCompleted) env.userProfile.onboardingCompleted = true
  }
  if (!env.userWords) env.userWords = []
  if (!env.hiddenWordIds) env.hiddenWordIds = []
  if (!env.metaLearning) env.metaLearning = createDefaultMeta()
  if (!env.metaLearning.methodStats) env.metaLearning.methodStats = createDefaultMeta().methodStats
  if (!env.metaLearning.wordMethods) env.metaLearning.wordMethods = {}
  if (env.activeLearningSession === undefined) env.activeLearningSession = null
  // clean polluted userWords once
  let dirty = false
  env.userWords = (env.userWords as any[]).map((w: any) => {
    const origBangla = w.banglaMeaning
    const origWord = w.word
    const cleanBangla = simpleSanitize(w.banglaMeaning)
    const cleanWord = simpleSanitize(w.word)
    const cleanMeaning = simpleSanitize(w.meaning)
    const cleanExample = simpleSanitize(w.example)
    if (cleanBangla !== origBangla || cleanWord !== origWord) dirty = true
    // also clean word if polluted title
    let finalWord = w.word
    let finalNorm = w.normalized
    if (cleanWord && cleanWord !== w.word) {
      finalWord = cleanWord
      finalNorm = cleanWord.toLowerCase().trim()
    }
    return { ...w, word: finalWord, normalized: finalNorm, banglaMeaning: cleanBangla, meaning: cleanMeaning, example: cleanExample }
  })
  // also clean synonyms/antonyms that are polluted
  env.userWords = env.userWords.map((w: any) => {
    if (w.synonyms) {
      const clean = (w.synonyms as string[]).map((s: string) => simpleSanitize(s)).filter(Boolean) as string[]
      if (clean.length !== w.synonyms.length) dirty = true
      w.synonyms = clean.length ? clean : undefined
    }
    if (w.antonyms) {
      const clean = (w.antonyms as string[]).map((s: string) => simpleSanitize(s)).filter(Boolean) as string[]
      if (clean.length !== w.antonyms.length) dirty = true
      w.antonyms = clean.length ? clean : undefined
    }
    return w
  })
  if (dirty) {
    // persist cleaned (fire and forget, will be saved on next saveEnvelope)
    setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify({ ...env, exportedAt: new Date().toISOString() })) } catch {}
    }, 0)
  }
  return env as StorageEnvelope
}

function safeParse(json: string | null): StorageEnvelope | null {
  if (!json) return null
  try {
    const p = JSON.parse(json)
    if (!p || p.version !== STORAGE_VERSION) return null
    return p as StorageEnvelope
  } catch { return null }
}

// broadcast helper for multi-tab
function broadcast() {
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL)
      bc.postMessage({ type: "envelope-updated", at: Date.now() })
      bc.close()
    }
  } catch {}
}

export async function loadEnvelope(): Promise<StorageEnvelope> {
  try {
    const db = await openDB<AppDB>(DB_NAME, 1, {
      upgrade(db) { db.createObjectStore(STORE) },
    })
    const val = await db.get(STORE, KEY)
    if (val) return migrateEnvelope(val)
  } catch {}
  const ls = safeParse(localStorage.getItem(LS_KEY))
  if (ls) return migrateEnvelope(ls)
  return defaultEnvelope()
}

export async function saveEnvelope(env: StorageEnvelope): Promise<void> {
  const toSave: StorageEnvelope = { ...env, exportedAt: new Date().toISOString() }
  // always mirror to LS
  try { localStorage.setItem(LS_KEY, JSON.stringify(toSave)) } catch {}
  try {
    const db = await openDB<AppDB>(DB_NAME, 1, {
      upgrade(db) { if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE) },
    })
    await db.put(STORE, toSave, KEY)
  } catch {}
  broadcast()
}

export function exportJson(env: StorageEnvelope): string {
  return JSON.stringify({ ...env, exportedAt: new Date().toISOString() }, null, 2)
}

export function importJson(json: string): StorageEnvelope {
  const parsed = JSON.parse(json)
  if (!parsed || parsed.version !== STORAGE_VERSION) throw new Error("Invalid envelope version")
  if (!parsed.wordProgress || !parsed.settings) throw new Error("Invalid envelope structure")
  if (Array.isArray(parsed.attempts) && parsed.attempts.length > 5000) parsed.attempts = parsed.attempts.slice(-5000)
  return migrateEnvelope(parsed)
}

export async function resetEnvelope(): Promise<StorageEnvelope> {
  const def = defaultEnvelope()
  await saveEnvelope(def)
  return def
}
