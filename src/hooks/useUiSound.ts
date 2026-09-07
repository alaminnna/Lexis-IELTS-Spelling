import { useCallback, useEffect } from "react"
import { uiSound } from "@/services/uiSound"
import { useAppStore } from "@/store/useAppStore"

export function useUiSound() {
  const enabled = useAppStore(s => s.envelope?.settings.soundEnabled ?? true)
  const volume = useAppStore(s => s.envelope?.settings.volume ?? 0.72)

  useEffect(() => { uiSound.init(volume, enabled) }, [volume, enabled])

  const withSound = useCallback((fn?: () => void, type: keyof typeof uiSound = "click") => {
    return () => {
      if (enabled) (uiSound as any)[type]?.()
      fn?.()
    }
  }, [enabled])

  return {
    play: (type: keyof typeof uiSound = "click") => enabled && (uiSound as any)[type]?.(),
    withSound,
    click: () => enabled && uiSound.click(),
    softClick: () => enabled && uiSound.softClick(),
    success: () => enabled && uiSound.success(),
    error: () => enabled && uiSound.error(),
    pop: () => enabled && uiSound.pop(),
    hover: () => enabled && uiSound.hover(),
    whoosh: () => enabled && uiSound.whoosh(),
    streak: () => enabled && uiSound.streak(),
    nav: () => enabled && uiSound.nav(),
    typeTick: (c?: string) => enabled && uiSound.typeTick(c),
    typeBackspace: () => enabled && uiSound.typeBackspace(),
    typeEnter: () => enabled && uiSound.typeEnter(),
  }
}
