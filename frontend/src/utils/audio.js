// Web Audio API based sound synthesizer for UI feedback
class SoundFX {
  constructor() {
    this.ctx = null
  }

  getAudioContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  playTone(freq, type = 'sine', duration = 0.08, gainVal = 0.05) {
    try {
      const ctx = this.getAudioContext()
      if (!ctx) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = type
      osc.frequency.setValueAtTime(freq, ctx.currentTime)

      gain.gain.setValueAtTime(gainVal, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start()
      osc.stop(ctx.currentTime + duration)
    } catch (_) {}
  }

  playClick() {
    this.playTone(800, 'sine', 0.04, 0.03)
  }

  playBeep() {
    this.playTone(1200, 'sine', 0.08, 0.06)
  }

  playSuccess() {
    try {
      const ctx = this.getAudioContext()
      if (!ctx) return
      const now = ctx.currentTime
      const notes = [523.25, 659.25, 783.99] // C5, E5, G5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + idx * 0.07)
        gain.gain.setValueAtTime(0.05, now + idx * 0.07)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.07 + 0.12)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now + idx * 0.07)
        osc.stop(now + idx * 0.07 + 0.12)
      })
    } catch (_) {}
  }

  playCashChing() {
    try {
      const ctx = this.getAudioContext()
      if (!ctx) return
      const now = ctx.currentTime
      const notes = [987.77, 1318.51] // B5, E6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, now + idx * 0.08)
        gain.gain.setValueAtTime(0.07, now + idx * 0.08)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.25)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now + idx * 0.08)
        osc.stop(now + idx * 0.08 + 0.25)
      })
    } catch (_) {}
  }

  playError() {
    this.playTone(220, 'sawtooth', 0.15, 0.05)
  }
}

export const sounds = new SoundFX()
export default sounds
