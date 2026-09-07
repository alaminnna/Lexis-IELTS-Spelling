import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import crypto from "node:crypto"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const mdFile = path.join(root, "1200_most_commonly_repeated_words_in (1)-2026-09-07_09-52-19.md")

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}
function catSlug(s) {
  return slugify(s)
}
function normalize(word) {
  return word.toLowerCase().trim().replace(/\s+/g, " ")
}
function difficultyFor(word) {
  const len = word.replace(/\s/g, "").length
  if (len <= 5) return "easy"
  if (len >= 10) return "hard"
  return "medium"
}

function parse() {
  const raw = fs.readFileSync(mdFile, "utf8")
  const lines = raw.split(/\r?\n/)
  /** @type {{word:string, category:string}[]} */
  const entries = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (trimmed.startsWith("The 1200")) continue
    // Category lines contain colon
    if (trimmed.includes(":")) {
      const idx = trimmed.indexOf(":")
      const cat = trimmed.slice(0, idx).trim()
      let rest = trimmed.slice(idx + 1).trim()
      // Some lines missing comma between July August - handle double spaces
      // Normalize delimiters: split on ; or ,
      // But phrases contain spaces, so split only on , and ;
      const parts = rest.split(/[;,]/).map(s => s.trim()).filter(Boolean)
      // Further handle case where parts still contain multiple words without comma? e.g. "July August"
      // That case would yield "July August" as single token – we want split into two if it contains multiple capitalized month names without comma
      // Heuristic: if part contains two capitalized words and original line had no comma between them, split
      // Instead, detect if part matches "July August" exactly – split
      const expanded = []
      for (const p of parts) {
        // Check for "July August" case and similar: two months stuck
        if (/^(July)\s+(August)$/i.test(p)) {
          expanded.push("July", "August")
        } else if (p.includes("  ")) {
          // double space indicates missing delimiter
          expanded.push(...p.split(/\s{2,}/).map(s => s.trim()).filter(Boolean))
        } else {
          expanded.push(p)
        }
      }
      for (const w of expanded) {
        if (!w) continue
        // Clean stray trailing periods
        const clean = w.replace(/\.+$/, "").trim()
        if (clean) entries.push({ word: clean, category: cat })
      }
    } else {
      // Lines without colon: possible continuation of previous category's list?
      // In our file, lines like "ferry, hover..." under Transportations – but those lines still have category? actually file splits.
      // For generic continuation, assume "Other" or previous category? We'll treat as Other.
      // Check if line looks like word list (contains commas)
      if (trimmed.includes(",") || trimmed.includes(";")) {
        const parts = trimmed.split(/[;,]/).map(s => s.trim()).filter(Boolean)
        for (const w of parts) {
          const clean = w.replace(/\.+$/, "").trim()
          if (clean) entries.push({ word: clean, category: "Other" })
        }
      }
    }
  }
  // Deduplicate case-insensitive, keep first category
  const seen = new Map()
  for (const e of entries) {
    const norm = normalize(e.word)
    if (!norm) continue
    if (!seen.has(norm)) seen.set(norm, e)
  }
  const unique = [...seen.values()]
  // Filter out garbage like single letters? keep valid
  const filtered = unique.filter(e => {
    const w = e.word.trim()
    return w.length >= 2 && w.length <= 60
  })
  // Sort alphabetically
  filtered.sort((a,b) => normalize(a.word).localeCompare(normalize(b.word)))
  const words = filtered.map(e => {
    const norm = normalize(e.word)
    return {
      id: slugify(norm),
      word: e.word,
      normalized: norm,
      category: e.category,
      categorySlug: catSlug(e.category),
      difficulty: difficultyFor(e.word),
    }
  })
  // Collect categories
  const cats = [...new Set(words.map(w => w.category))].sort()
  const hash = crypto.createHash("sha256").update(JSON.stringify(words)).digest("hex").slice(0,12)
  return { words, cats, hash, count: words.length }
}

function emit() {
  const { words, cats, hash, count } = parse()
  console.log(`Parsed ${count} words across ${cats.length} categories (hash ${hash})`)
  cats.forEach(c => console.log(` - ${c}`))
  const outDir = path.join(root, "src", "data")
  fs.mkdirSync(outDir, { recursive: true })
  const file = path.join(outDir, "words.ts")
  const content = `// AUTO-GENERATED from IELTS MD – do not edit manually
// Generated: ${new Date().toISOString()}
// Source hash: ${hash}
// Words: ${count} | Categories: ${cats.length}

export type Difficulty = "easy" | "medium" | "hard"
export type Word = {
  id: string
  word: string
  normalized: string
  category: string
  categorySlug: string
  difficulty: Difficulty
}

export const WORDS: Word[] = ${JSON.stringify(words, null, 2)} as Word[]

export const CATEGORIES: string[] = ${JSON.stringify(cats, null, 2)}

export const WORD_MAP = new Map<string, Word>(WORDS.map(w => [w.id, w]))
export const CATEGORY_SLUGS = [...new Set(WORDS.map(w => w.categorySlug))].sort()
`
  fs.writeFileSync(file, content, "utf8")
  console.log(`Wrote ${file}`)
}

emit()
