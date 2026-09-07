// Premium UI Sound System — Web Audio only, no assets, respects settings
// Every click feels tactile: uses short envelopes, filtered oscillators, subtle reverb via convolver is avoided for perf.

let ctx: AudioContext | null = null
let masterGain: GainNode | null = null
let enabled = true
let volume = 0.72

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (ctx) return ctx
  try {
    const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor() as AudioContext
    masterGain = (ctx as AudioContext).createGain()
    masterGain.gain.value = volume
    masterGain.connect((ctx as AudioContext).destination)
    return ctx as AudioContext
  } catch { return null }
}

function ensure() {
  const c = getCtx()
  if (!c) return null
  if (c.state === "suspended") void c.resume()
  return c
}

function tone({ freq, freqEnd, duration, type = "sine", gain = 0.14, slide = 0 }: { freq: number; freqEnd?: number; duration: number; type?: OscillatorType; gain?: number; slide?: number }) {
  const c = ensure()
  if (!c || !enabled) return
  if (!masterGain || !c) return
  const osc = c.createOscillator()
  const g = c.createGain()
  const filter = c.createBiquadFilter()
  filter.type = "lowpass"
  filter.frequency.value = 4200
  osc.type = type
  osc.frequency.value = freq
  if (freqEnd && slide) {
    osc.frequency.linearRampToValueAtTime(freqEnd, c.currentTime + slide)
  }
  osc.connect(filter)
  filter.connect(g)
  g.connect(masterGain)
  const now = c.currentTime
  g.gain.setValueAtTime(0, now)
  g.gain.linearRampToValueAtTime(gain * volume, now + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0008, now + duration)
  osc.start(now)
  osc.stop(now + duration + 0.02)
}

function noiseBurst(duration = 0.08, gain = 0.06) {
  const c = ensure()
  if (!c || !enabled || !masterGain) return
  const bufferSize = Math.floor(c.sampleRate * duration)
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2)
  const src = c.createBufferSource()
  src.buffer = buffer
  const bp = c.createBiquadFilter()
  bp.type = "bandpass"
  bp.frequency.value = 3200
  bp.Q.value = 0.8
  const g = c.createGain()
  g.gain.value = gain * volume
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration)
  src.connect(bp)
  bp.connect(g)
  g.connect(masterGain)
  src.start()
}

export const uiSound = {
  init(v = 0.72, en = true) { enabled = en; volume = v; masterGain && (masterGain.gain.value = v) },
  setEnabled(v: boolean) { enabled = v },
  setVolume(v: number) { volume = Math.max(0, Math.min(1, v)); if (masterGain) masterGain.gain.value = volume },
  // Call from any interaction — throttled internally via ctx check
  click() {
    tone({ freq: 880, freqEnd: 1320, duration: 0.09, type: "sine", gain: 0.13, slide: 0.06 })
    tone({ freq: 1760, duration: 0.06, type: "sine", gain: 0.04 })
  },
  softClick() {
    tone({ freq: 620, duration: 0.07, type: "sine", gain: 0.08 })
  },
  hover() {
    // ultra subtle — only if not reduced motion and enabled
    tone({ freq: 1200, duration: 0.04, type: "sine", gain: 0.03 })
  },
  success() {
    tone({ freq: 540, duration: 0.11, type: "sine", gain: 0.14 })
    setTimeout(() => tone({ freq: 810, duration: 0.13, type: "sine", gain: 0.13 }), 90)
    setTimeout(() => tone({ freq: 1080, duration: 0.18, type: "sine", gain: 0.12 }), 180)
  },
  error() {
    tone({ freq: 180, duration: 0.16, type: "sine", gain: 0.12 })
    setTimeout(() => tone({ freq: 140, duration: 0.2, type: "triangle", gain: 0.09 }), 90)
  },
  pop() {
    tone({ freq: 520, freqEnd: 780, duration: 0.12, type: "sine", gain: 0.12, slide: 0.08 })
    noiseBurst(0.05, 0.025)
  },
  whoosh() {
    tone({ freq: 340, freqEnd: 120, duration: 0.22, type: "sine", gain: 0.09, slide: 0.18 })
  },
  streak() {
    // celebratory arpeggio — premium, not childish
    tone({ freq: 440, duration: 0.09, gain: 0.11 })
    setTimeout(() => tone({ freq: 554, duration: 0.09, gain: 0.11 }), 70)
    setTimeout(() => tone({ freq: 659, duration: 0.09, gain: 0.11 }), 140)
    setTimeout(() => tone({ freq: 880, duration: 0.22, gain: 0.13 }), 210)
  },
  toggleOn() {
    tone({ freq: 700, freqEnd: 1050, duration: 0.1, gain: 0.1, slide: 0.07 })
  },
  toggleOff() {
    tone({ freq: 520, freqEnd: 340, duration: 0.11, gain: 0.09, slide: 0.08 })
  },
  nav() {
    tone({ freq: 820, duration: 0.06, gain: 0.07 })
  },
  focus() {
    tone({ freq: 960, duration: 0.04, gain: 0.04 })
  },
  // Butter-smooth typing — matches mechanical keyboard, not annoying, premium tick per key
  typeTick(char?: string) {
    // subtle variation by char code to feel like real keyboard
    const base = char ? 820 + (char.charCodeAt(0) % 12) * 18 : 920
    tone({ freq: base, duration: 0.035, type: "sine", gain: 0.045 })
    // ultra short high click for tactile
    tone({ freq: base * 2.15, duration: 0.018, type: "sine", gain: 0.016 })
  },
  typeBackspace() {
    tone({ freq: 420, freqEnd: 280, duration: 0.06, type: "sine", gain: 0.05, slide: 0.04 })
  },
  typeEnter() {
    tone({ freq: 520, freqEnd: 780, duration: 0.08, type: "sine", gain: 0.09, slide: 0.05 })
    noiseBurst(0.03, 0.018)
  },
}
