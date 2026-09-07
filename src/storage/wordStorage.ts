import type { Word } from "@/types/word"
import { useAppStore } from "@/store/useAppStore"

export function getCustomWords(): Word[] {
  return useAppStore.getState().envelope?.userWords ?? []
}

export async function saveCustomWord(word: Word): Promise<void> {
  const store = useAppStore.getState()
  const env = store.envelope
  if (!env) return
  env.userWords = [...env.userWords, word]
  useAppStore.setState({ envelope: { ...env } })
  await store.persist()
}

export async function deleteCustomWord(id: string): Promise<boolean> {
  const store = useAppStore.getState()
  const env = store.envelope
  if (!env) return false
  const before = env.userWords.length
  env.userWords = env.userWords.filter(w => w.id !== id)
  useAppStore.setState({ envelope: { ...env } })
  await store.persist()
  return env.userWords.length < before
}
