import * as React from "react"
import { cn } from "@/utils/cn"
export function Dialog({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal className={cn("relative w-full max-w-md rounded-xl border bg-card shadow-xl p-6 animate-in")}>
        {children}
      </div>
    </div>
  )
}
