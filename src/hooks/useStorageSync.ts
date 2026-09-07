import { useEffect } from "react"
import { useAppStore } from "@/store/useAppStore"
import { LS_KEY, BROADCAST_CHANNEL } from "@/storage/storageKeys"
import { loadEnvelope } from "@/services/storage"

export function useStorageSync() {
  const reload = useAppStore(s => s.reload)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY) void reload()
    }
    window.addEventListener("storage", onStorage)
    let bc: BroadcastChannel | null = null
    try {
      if (typeof BroadcastChannel !== "undefined") {
        bc = new BroadcastChannel(BROADCAST_CHANNEL)
        bc.onmessage = (ev) => {
          if (ev.data?.type === "envelope-updated") void reload()
        }
      }
    } catch {}
    return () => {
      window.removeEventListener("storage", onStorage)
      try { bc?.close() } catch {}
    }
  }, [reload])
}
