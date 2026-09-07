export type Difficulty = "easy" | "medium" | "hard"
export type WordSource = "system" | "user"

export type Word = {
  id: string
  word: string
  normalized: string
  category: string
  categorySlug: string
  difficulty: Difficulty
  source?: WordSource
  // dictionary / learning fields (optional, not in system source)
  banglaMeaning?: string
  meaning?: string
  partOfSpeech?: string
  pronunciation?: string
  example?: string
  synonyms?: string[]
  antonyms?: string[]
  personalNote?: string
  audioUrl?: string
  spellingTip?: string
  createdAt?: string
  updatedAt?: string
  hidden?: boolean
}
