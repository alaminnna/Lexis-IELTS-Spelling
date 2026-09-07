// Web Speech API wrapper with Web Audio chimes
let voice: SpeechSynthesisVoice | null = null
let voicesReady = false

function loadVoices(): Promise<void> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return Promise.resolve()
  return new Promise((resolve) => {
    const synth = window.speechSynthesis
    const pick = () => {
      const vs = synth.getVoices()
      if (vs.length) {
        // Prefer en-GB then en-US
        voice =
          vs.find(v => v.lang.toLowerCase().includes("en-gb") && v.name.toLowerCase().includes("google")) ??
          vs.find(v => v.lang.toLowerCase().includes("en-gb")) ??
          vs.find(v => v.lang.toLowerCase().includes("en-us") && v.name.toLowerCase().includes("google")) ??
          vs.find(v => v.lang.toLowerCase().startsWith("en")) ??
          vs[0] ?? null
        voicesReady = true
        resolve()
      }
    }
    pick()
    if (!voicesReady) {
      synth.onvoiceschanged = () => pick()
      // fallback timeout
      setTimeout(() => { if (!voicesReady) { pick(); resolve() } }, 800)
    }
  })
}

let audioCtx: AudioContext | null = null
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (audioCtx) return audioCtx
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!Ctx) return null
    audioCtx = new Ctx()
    return audioCtx
  } catch { return null }
}

function tone(freq: number, duration: number, type: OscillatorType = "sine", gain = 0.12, ctx: AudioContext) {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  osc.connect(g)
  g.connect(ctx.destination)
  g.gain.setValueAtTime(gain, ctx.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  osc.start()
  osc.stop(ctx.currentTime + duration)
}

export const audioService = {
  enabled: true,
  volume: 0.7,
  slow: false,
  async init() { await loadVoices() },
  setEnabled(v: boolean) { this.enabled = v },
  setVolume(v: number) { this.volume = Math.max(0, Math.min(1, v)) },
  setSlow(v: boolean) { this.slow = v },
  cancel() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel()
  },
  async speak(word: string, opts?: { slow?: boolean; volume?: number }) {
    if (!this.enabled) return
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return
    await loadVoices()
    this.cancel()
    const utter = new SpeechSynthesisUtterance(word)
    if (voice) utter.voice = voice
    utter.rate = opts?.slow ?? this.slow ? 0.62 : 0.9
    utter.pitch = 1
    utter.volume = opts?.volume ?? this.volume
    // brief delay to allow cancel to flush
    await new Promise(r => setTimeout(r, 40))
    window.speechSynthesis.speak(utter)
    // return promise that resolves on end/error
    return new Promise<void>((resolve) => {
      utter.onend = () => resolve()
      utter.onerror = () => resolve()
      // fallback
      setTimeout(resolve, 3500)
    })
  },
  playChime(type: "correct" | "wrong" | "streak" | "complete") {
    if (!this.enabled) return
    const ctx = getCtx()
    if (!ctx) return
    if (ctx.state === "suspended") ctx.resume()
    const vol = this.volume * 0.22
    switch (type) {
      case "correct": {
        tone(880, 0.14, "sine", vol, ctx)
        setTimeout(() => tone(1320, 0.18, "sine", vol * 0.9, ctx), 90)
        break
      }
      case "wrong": {
        tone(220, 0.22, "sine", vol, ctx)
        setTimeout(() => tone(165, 0.24, "sine", vol, ctx), 110)
        break
      }
      case "streak": {
        tone(523, 0.12, "sine", vol, ctx)
        setTimeout(() => tone(659, 0.12, "sine", vol, ctx), 90)
        setTimeout(() => tone(784, 0.18, "sine", vol, ctx), 180)
        break
      }
      case "complete": {
        tone(440, 0.14, "sine", vol, ctx)
        setTimeout(() => tone(554, 0.14, "sine", vol, ctx), 120)
        setTimeout(() => tone(659, 0.14, "sine", vol, ctx), 240)
        setTimeout(() => tone(880, 0.36, "sine", vol, ctx), 360)
        break
      }
    }
  },
}
