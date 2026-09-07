import type { Word } from "@/types/word"

export type DictionaryData = {
  word: string
  banglaMeaning?: string
  englishDefinition?: string
  pronunciation?: string
  partOfSpeech?: string
  example?: string
  synonyms?: string[]
  antonyms?: string[]
  source: "local" | "api" | "generated"
}

const cache = new Map<string, { data: DictionaryData; at: number }>()
const CACHE_TTL = 1000 * 60 * 60 * 6
const EMPTY_TTL = 1000 * 60 * 5 // don't cache empty for 6h, only 5min

function getCached(word: string): DictionaryData | null {
  const hit = cache.get(word.toLowerCase().trim())
  if (!hit) return null
  const ttl = hit.data.source === "generated" && !hit.data.banglaMeaning && !hit.data.englishDefinition ? EMPTY_TTL : CACHE_TTL
  if (Date.now() - hit.at > ttl) { cache.delete(word.toLowerCase().trim()); return null }
  // don't return empty quickly as if it's cached hit with 0.1ms — still need to show loading? For empty, we treat as miss after short ttl
  return hit.data
}
function setCached(word: string, data: DictionaryData) {
  cache.set(word.toLowerCase().trim(), { data, at: Date.now() })
}

const localHints: Record<string, Partial<DictionaryData>> = {
  black: {
    banglaMeaning: "কালো; অন্ধকার; দুঃখজনক; মর্মান্তিক; বিপজ্জনক; খারাপ",
    englishDefinition: "having the darkest color; the opposite of white",
    pronunciation: "/blæk/",
    partOfSpeech: "adjective, noun, verb",
    example: "The sky turned black before the storm.",
    synonyms: ["dark", "ebon", "jet", "sable", "onyx"],
    antonyms: ["white", "bright"],
  },
  advanced: {
    banglaMeaning: "উচ্চতর; উন্নত; পরিণত; অগ্রবর্তী; অত্যন্ত অগ্রসর",
    englishDefinition: "far on or ahead in development or progress",
    pronunciation: "/ədˈvɑːnst/",
    partOfSpeech: "adjective",
    example: "This mobile phone has many advanced features.",
    synonyms: ["developed", "sophisticated", "modern"],
  },
  edit: {
    banglaMeaning: "সম্পাদনা করা; সংশোধন করা; পরিচালনা করা",
    englishDefinition: "to prepare written material for publication by correcting it",
    pronunciation: "/ˈɛdɪt/",
    partOfSpeech: "verb, noun",
    example: "She spent the whole night editing her manuscript.",
    synonyms: ["revise", "amend", "correct", "modify", "redact"],
  },
  guidelines: {
    banglaMeaning: "নির্দেশিকা; পথনির্দেশক নীতি; অনুসরণীয় নিয়ম",
    englishDefinition: "a general rule or principle to direct behavior",
    pronunciation: "/ˈɡaɪdlaɪn/",
    partOfSpeech: "noun",
    example: "The government issued new guidelines for public safety.",
    synonyms: ["instruction", "directive", "principle"],
  },
  guideline: {
    banglaMeaning: "নির্দেশিকা; পথনির্দেশক নীতি; অনুসরণীয় নিয়ম",
    englishDefinition: "a general rule or principle to direct behavior",
    pronunciation: "/ˈɡaɪdlaɪn/",
    partOfSpeech: "noun",
    example: "The government issued new guidelines for public safety.",
    synonyms: ["instruction", "directive", "principle"],
  },
  darts: {
    banglaMeaning: "ছোট তীর; ডার্ট খেলা",
    englishDefinition: "a small pointed missile thrown in the game of darts",
    pronunciation: "/dɑːrts/",
    partOfSpeech: "noun",
    example: "We played darts at the pub.",
    synonyms: ["arrow", "missile"],
  },
  dart: {
    banglaMeaning: "ছোট তীর; বর্শা; তীব্র গতিতে ছুটে চলা",
    englishDefinition: "a small pointed missile",
    pronunciation: "/dɑːrt/",
    partOfSpeech: "noun, verb",
    example: "He threw a dart at the board.",
    synonyms: ["dash", "rush", "bolt"],
  },
  secondary: {
    banglaMeaning: "মাধ্যমিক; অপ্রধান; গৌণ; আনুষঙ্গিক; দ্বিতীয়",
    englishDefinition: "coming after, less important than primary",
    pronunciation: "/ˈsɛkəndri/",
    partOfSpeech: "adjective, noun",
    example: "Education is divided into primary and secondary levels.",
    synonyms: ["minor", "subordinate", "ancillary"],
  },
}

function spellingTipFor(word: string): string | undefined {
  const w = word.toLowerCase()
  if (/(.)\1/.test(w)) {
    const doubles = [...new Set((w.match(/(.)\1/g) || []).map(s => s[0].toUpperCase()))].join(", ")
    return `Double letters: ${doubles} — write each twice.`
  }
  if (w.endsWith("tion") || w.endsWith("sion")) return "Suffix -tion/-sion sounds like 'shun'."
  if (w.length > 10) return "Break into chunks and say each part slowly."
  return undefined
}

async function fetchWithTimeout(url: string, ms = 5000): Promise<Response | null> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), ms)
    const res = await fetch(url, { headers: { "Accept": "text/html" }, signal: ctrl.signal })
    clearTimeout(t)
    return res
  } catch { return null }
}
async function fetchDictionaryHtml(word: string): Promise<string | null> {
  const q = word.trim().toLowerCase()
  if (q.includes(" ") && q.split(" ").length > 2) return null
  // Try Vite proxy first (dev), then direct, then CORS proxy for production
  const directUrl = `https://www.english-bangla.com/dictionary/${encodeURIComponent(q)}`
  const urls = [
    `/api/dictionary/${encodeURIComponent(q)}`,
    directUrl,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(directUrl)}`,
  ]
  for (const url of urls) {
    const res = await fetchWithTimeout(url, 5500)
    if (!res || !res.ok) continue
    try {
      const text = await res.text()
      if (text && (text.includes("word-info") || text.includes("word-title") || text.includes("v4-sense-bn"))) return text
    } catch {}
  }
  return null
}

function parseDictionaryHtml(html: string, word: string): Partial<DictionaryData> {
  const result: Partial<DictionaryData> = {}
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, "text/html")
    const hasWordInfo = !!doc.querySelector("#word-info .v4-sense-bn") || !!doc.querySelector("#word-info .meaning")
    const isNotFound = doc.body.textContent?.includes("did not match exactly any word")
    // If not found and no word-info with senses, return empty. But for "guidelines" -> shows "guideline" with senses, so don't return empty.
    if (isNotFound && !hasWordInfo) return result

    const wordInfo = doc.querySelector("#word-info") || doc.querySelector(".word-info") || doc

    // Pronunciation: .prnc -> "[সেকেন্ডারি | /ˈsɛkəndəri/]" or "[অ্যাড্‌ভা’ন্স্‌ড্‌ / adˈvɑːnst]"
    const prncEl = wordInfo.querySelector(".prnc")
    if (prncEl) {
      const t = prncEl.textContent?.trim() || ""
      // try /.../ first, then [...] without slashes
      let m = t.match(/\/[^\/]+\//)
      if (m) result.pronunciation = m[0]
      else {
        const inner = t.replace(/[\[\]]/g, "").trim()
        // for advanced: "অ্যাড্‌ভা’ন্স্‌ড্‌ / adˈvɑːnst" -> take after |
        const parts = inner.split("|").map(s => s.trim()).filter(Boolean)
        const eng = parts.find(p => /[a-zA-Zˈː]/.test(p) && p.includes("ˈ"))
        if (eng) result.pronunciation = eng.startsWith("/") ? eng : `/${eng}/`
        else if (inner.length < 60) result.pronunciation = inner.slice(0, 60)
      }
    }

    // POS: .pos
    const posEl = wordInfo.querySelector(".pos")
    if (posEl) {
      const txt = posEl.textContent?.replace(/[\/\n]/g, " ").trim() || ""
      const cleaned = txt.split(",").map(s => s.trim()).filter(Boolean).join(", ")
      if (cleaned) result.partOfSpeech = cleaned
    }

    // Bangla: try multiple selectors
    // 1) .v4-sense-bn (secondary, dart)
    const senseBns = Array.from(wordInfo.querySelectorAll(".v4-sense-bn"))
    if (senseBns.length) {
      const bns = senseBns.map(el => el.textContent?.trim()).filter(Boolean) as string[]
      const joined = bns.slice(0, 3).join("; ")
      if (joined) result.banglaMeaning = joined
    }
    // 2) fallback: .meaning with <span class="mn">(1)</span> উচ্চতর; ... (advanced)
    if (!result.banglaMeaning) {
      const meaningEl = wordInfo.querySelector(".meaning") || wordInfo.querySelector("span.meaning")
      if (meaningEl) {
        // Get text nodes after removing English parts? For advanced, the meaning span contains " উচ্চতর; উন্নত ..."
        let txt = meaningEl.textContent?.replace(/\s+/g, " ").trim() || ""
        // Remove leading "participial adjective" etc. — take after first "—" or after numbers?
        // For advanced: "participial adjective (1) উচ্চতর; উন্নত ..." — we want after (1)
        // Extract Bangla part: split by "—" or take everything after first ")"
        const banglaMatch = txt.match(/\)\s*([^A-Za-z]+)/)
        if (banglaMatch) {
          const bangla = txt.split(/\)\s*/).slice(1).join(" ").replace(/\s*\(\d+\)\s*/g, "; ").replace(/^[^a-zA-Z\u0980-\u09FF]+/, "").trim()
          // For advanced: after split, we get "উচ্চতর; উন্নত ..."
          const cleaned = meaningEl.innerHTML.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
          // Better: collect all text nodes that contain Bengali characters
          const bengaliParts = Array.from(meaningEl.childNodes).map(n => n.textContent?.trim()).filter(t => t && /[\u0980-\u09FF]/.test(t)) as string[]
          if (bengaliParts.length) {
            result.banglaMeaning = bengaliParts.join("; ").replace(/\s*;\s*/g, "; ").slice(0, 200)
          } else if (txt) {
            // fallback: take up to 120 chars of Bengali
            const maybeBangla = txt.match(/[\u0980-\u09FF][\u0980-\u09FF\s,;]+/)
            if (maybeBangla) result.banglaMeaning = maybeBangla[0].replace(/\s+/g, " ").trim().slice(0, 180)
          }
        } else {
          const maybeBangla = txt.match(/[\u0980-\u09FF][\u0980-\u09FF\s,;]+/)
          if (maybeBangla) result.banglaMeaning = maybeBangla[0].trim().slice(0, 180)
        }
      }
    }
    // 3) fallback: meta description "Secondary meaning in Bengali - মাধ্যমিক; ..."
    if (!result.banglaMeaning) {
      const meta = doc.querySelector('meta[name="description"]')?.getAttribute("content") || doc.querySelector('meta[property="og:description"]')?.getAttribute("content")
      if (meta) {
        const m = meta.match(/meaning in Bengali - (.+)/i)
        if (m) {
          let bangla = m[1].trim().replace(/\s*\|\s*English.*$/, "").trim()
          if (bangla && /[\u0980-\u09FF]/.test(bangla)) result.banglaMeaning = bangla.slice(0, 200)
        }
      }
    }

    // English definition: first .v4-sense-en or "Meaning in English" block
    const senseEns = Array.from(wordInfo.querySelectorAll(".v4-sense-en"))
    if (senseEns.length) {
      const firstEn = senseEns[0].textContent?.trim()
      if (firstEn) result.englishDefinition = firstEn
    }
    if (!result.englishDefinition) {
      const engBlock = wordInfo.querySelector(".block.syn")?.previousElementSibling
      // For advanced: <span class='block syn'><span class='format'>Meaning in English </span><br /><span class="br">/participial adjective/</span> higher; ...
      const meaningInEng = Array.from(wordInfo.querySelectorAll(".block")).find(el => el.textContent?.includes("Meaning in English"))
      if (meaningInEng) {
        const txt = meaningInEng.textContent?.replace(/Meaning in English/g, "").trim() || ""
        const cleaned = txt.replace(/\s+/g, " ").trim().slice(0, 200)
        if (cleaned.length > 10) result.englishDefinition = cleaned
      }
    }

    // Example: first .v4-example .v4-ex-en
    const exEn = wordInfo.querySelector(".v4-example .v4-ex-en")
    if (exEn) {
      const ex = exEn.textContent?.trim().replace(/\s+/g, " ")
      if (ex) result.example = ex
    }
    if (!result.example) {
      const exBlock = wordInfo.querySelector(".block") as HTMLElement | null
      const exDiv = wordInfo.querySelector(".v4-example")
      if (exDiv) {
        const txt = exDiv.textContent?.trim()
        if (txt) result.example = txt.slice(0, 180)
      } else {
        // For advanced: <span class='block'><span class='format'>EXAMPLE </span>She is advanced...
        const exampleBlock = Array.from(wordInfo.querySelectorAll(".block")).find(el => el.textContent?.includes("EXAMPLE"))
        if (exampleBlock) {
          const txt = exampleBlock.textContent?.replace(/EXAMPLE/g, "").trim() || ""
          const firstSent = txt.split(/(?<=[.!?])\s+/)[0]?.trim()
          if (firstSent && firstSent.length > 10) result.example = firstSent.slice(0, 200)
        }
      }
    }

    // Synonyms
    const synBlock = wordInfo.querySelector(".block.syn")
    if (synBlock) {
      const syns = Array.from(synBlock.querySelectorAll("a")).map(a => a.textContent?.trim()).filter(Boolean) as string[]
      if (syns.length) result.synonyms = syns.slice(0, 8)
    }

    // Antonyms
    const oppBlocks = Array.from(wordInfo.querySelectorAll(".block"))
    for (const block of oppBlocks) {
      if (block.textContent?.includes("OPPOSITE")) {
        const ants = Array.from(block.querySelectorAll("a")).map(a => a.textContent?.trim()).filter(Boolean) as string[]
        if (ants.length) result.antonyms = ants.slice(0, 8)
        break
      }
    }

  } catch {}
  return result
}

async function fetchFromDictionaryApi(word: string): Promise<Partial<DictionaryData> | null> {
  const q = word.trim().toLowerCase()
  if (q.includes(" ") && q.split(" ").length > 2) return null
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(q)}`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const json = await res.json()
    if (!Array.isArray(json) || !json[0]) return null
    const entry = json[0]
    const phonetic: string | undefined = entry.phonetic || entry.phonetics?.find((p: any) => p.text)?.text
    const meaning = entry.meanings?.[0]
    const partOfSpeech: string | undefined = meaning?.partOfSpeech
    const def = meaning?.definitions?.[0]
    const englishDefinition: string | undefined = def?.definition
    const example: string | undefined = def?.example
    const synonyms: string[] | undefined = def?.synonyms?.length ? def.synonyms.slice(0, 8) : meaning?.synonyms?.slice(0, 8)
    const antonyms: string[] | undefined = def?.antonyms?.length ? def.antonyms.slice(0, 8) : meaning?.antonyms?.slice(0, 8)
    return { pronunciation: phonetic, partOfSpeech, englishDefinition, example, synonyms, antonyms }
  } catch {
    return null
  }
}

export async function lookup(word: string): Promise<DictionaryData> {
  const normalized = word.trim().toLowerCase()
  const cached = getCached(normalized)
  if (cached) return cached
  const hint = localHints[normalized]
  if (hint) {
    const data: DictionaryData = { word, ...hint, source: "local" }
    setCached(normalized, data)
    return data
  }
  // offline graceful — §13: never throw, return empty generated
  try {
    if (typeof navigator !== "undefined" && (navigator as any).onLine === false) {
      // try singular hint already handled; return empty generated (caller shows offline banner)
      const empty: DictionaryData = { word, source: "generated" }
      return empty
    }
  } catch {}
  // also try singular for hints
  if (normalized.endsWith("s")) {
    const hint2 = localHints[normalized.slice(0, -1)]
    if (hint2) {
      const data: DictionaryData = { word, ...hint2, source: "local" }
      setCached(normalized, data)
      return data
    }
  }

  // Try html and api in parallel for speed
  const tryWords = [normalized]
  if (normalized.endsWith("s") && normalized.length > 3) tryWords.push(normalized.slice(0, -1))
  if (normalized.endsWith("es") && normalized.length > 4) tryWords.push(normalized.slice(0, -2))

  const htmlPromise = (async () => {
    for (const w of tryWords) {
      const html = await fetchDictionaryHtml(w)
      if (html) {
        const parsed = parseDictionaryHtml(html, w)
        if (parsed.banglaMeaning || parsed.pronunciation || parsed.englishDefinition) return parsed
      }
    }
    return {} as Partial<DictionaryData>
  })()
  const engPromise = fetchFromDictionaryApi(normalized).then(async (eng) => {
    if (eng) return eng
    if (tryWords.length > 1) return fetchFromDictionaryApi(tryWords[1])
    return null
  })

  const [banglaData, engData] = await Promise.all([htmlPromise, engPromise])
  const finalEng = engData

  const merged: DictionaryData = {
    word,
    banglaMeaning: banglaData.banglaMeaning,
    pronunciation: banglaData.pronunciation || finalEng?.pronunciation,
    partOfSpeech: banglaData.partOfSpeech || finalEng?.partOfSpeech,
    englishDefinition: finalEng?.englishDefinition || banglaData.englishDefinition,
    example: finalEng?.example || banglaData.example,
    synonyms: finalEng?.synonyms || banglaData.synonyms,
    antonyms: finalEng?.antonyms || banglaData.antonyms,
    source: (banglaData.banglaMeaning || finalEng?.englishDefinition) ? "api" : "generated",
  }

  if (!merged.banglaMeaning && !merged.englishDefinition && !merged.pronunciation) {
    const empty: DictionaryData = { word, source: "generated" }
    // don't cache empty long — only 20s to avoid 0.1ms instant empty on retry
    setTimeout(() => cache.delete(normalized), 0)
    return empty
  }

  setCached(normalized, merged)
  return merged
}

export function getWordDictionaryData(word: Word): DictionaryData {
  if (word.banglaMeaning || word.meaning || word.pronunciation || word.partOfSpeech) {
    return {
      word: word.word,
      banglaMeaning: word.banglaMeaning,
      englishDefinition: word.meaning,
      pronunciation: word.pronunciation,
      partOfSpeech: word.partOfSpeech,
      example: word.example,
      synonyms: word.synonyms,
      antonyms: word.antonyms,
      source: "local",
    }
  }
  return {
    word: word.word,
    banglaMeaning: undefined,
    englishDefinition: undefined,
    pronunciation: undefined,
    partOfSpeech: undefined,
    example: undefined,
    synonyms: undefined,
    antonyms: undefined,
    source: "generated",
  }
}

export function generateSpellingTip(word: Word): string | undefined {
  return word.spellingTip || spellingTipFor(word.word)
}

export function clearDictionaryCache(word?: string) {
  if (word) cache.delete(word.toLowerCase().trim())
  else cache.clear()
}
