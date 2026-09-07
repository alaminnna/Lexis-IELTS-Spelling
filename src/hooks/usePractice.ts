import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { WORDS } from "@/data/words"
import { useAppStore } from "@/store/useAppStore"
import { selectNextWords } from "@/services/adaptiveReview"
import type { PracticeMode } from "@/types/progress"

export function usePractice(mode: PracticeMode, count: number) {
  const envelope = useAppStore(s => s.envelope)
  const adaptiveEnabled = envelope?.settings.adaptiveEnabled ?? true

  const wordList = useMemo(() => {
    if (!envelope) return []
    const progress = envelope.wordProgress
    const effectiveCount = mode === "quick10" ? 10 : mode === "challenge50" ? 50 : count
    return selectNextWords(WORDS, progress, mode, effectiveCount, adaptiveEnabled)
  }, [envelope, mode, count, adaptiveEnabled])

  const [idx, setIdx] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const word = wordList[idx] ?? null
  const start = useCallback(() => setStartedAt(Date.now()), [])
  const next = useCallback(() => setIdx(i => Math.min(i + 1, wordList.length)), [wordList.length])
  const reset = useCallback(() => { setIdx(0); setStartedAt(Date.now()) }, [])
  const progressPct = wordList.length ? ((idx) / wordList.length) * 100 : 0
  const responseMs = useCallback(() => startedAt ? Date.now() - startedAt : 0, [startedAt])

  // reset when mode/count changes
  useEffect(() => { setIdx(0); setStartedAt(Date.now()) }, [mode, count, adaptiveEnabled])

  return { wordList, word, idx, next, reset, start, responseMs, progressPct, total: wordList.length }
}
