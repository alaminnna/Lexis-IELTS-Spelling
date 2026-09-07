import type { Settings } from "@/types/progress"
import { useAppStore } from "@/store/useAppStore"

export function getSettings(): Settings | null {
  return useAppStore.getState().envelope?.settings ?? null
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  const store = useAppStore.getState()
  store.updateSettings(patch)
}
