import { cn } from "@/utils/cn"
export function Badge({ className, ...p }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide", className)} {...p} />
}
