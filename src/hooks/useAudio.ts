import { useEffect, useState } from "react"
import { audioService } from "@/services/audio"
import { useAppStore } from "@/store/useAppStore"

export function useAudio() {
  const { envelope, updateSettings } = useAppStore()
  const enabled = envelope?.settings.soundEnabled ?? true
  const volume = envelope?.settings.volume ?? 0.72
  const autoPlay = envelope?.settings.autoPlay ?? true
  const slow = envelope?.settings.slowRate ?? false

  useEffect(() => { void audioService.init(); audioService.setEnabled(enabled); audioService.setVolume(volume); audioService.setSlow(slow) }, [enabled, volume, slow])

  const speak = (word: string, slowOverride?: boolean) => audioService.speak(word, { slow: slowOverride ?? slow, volume })
  const cancel = () => audioService.cancel()
  const chime = (t: "correct" | "wrong" | "streak" | "complete") => audioService.playChime(t)
  const toggle = () => updateSettings({ soundEnabled: !enabled })
  const setVolume = (v: number) => updateSettings({ volume: v })
  return { enabled, volume, autoPlay, slow, speak, cancel, chime, toggle, setVolume }
}
