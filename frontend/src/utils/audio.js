// Web Audio API Synthesizer for high-tech UI feedback sound effects
class SoundController {
  constructor() {
    this.enabled = localStorage.getItem('sound_enabled') !== 'false'
    this.audioCtx = null
  }

  init() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (AudioContext) {
        this.audioCtx = new AudioContext()
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume()
    }
  }

  toggleSound() {
    this.enabled = !this.enabled
    localStorage.setItem('sound_enabled', this.enabled ? 'true' : 'false')
    return this.enabled
  }

  isSoundEnabled() {
    return this.enabled
  }

  // Barcode scan beep sound
  playBeep() {
    if (!this.enabled) return
    try {
      this.init()
      if (!this.audioCtx) return

      const osc = this.audioCtx.createOscillator()
      const gain = this.audioCtx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(1800, this.audioCtx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(2400, this.audioCtx.currentTime + 0.08)

      gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.08)

      osc.connect(gain)
      gain.connect(this.audioCtx.destination)

      osc.start()
      osc.stop(this.audioCtx.currentTime + 0.08)
    } catch (_) {}
  }

  // Cash register cha-ching sound for POS sale
  playCashChing() {
    if (!this.enabled) return
    try {
      this.init()
      if (!this.audioCtx) return

      const now = this.audioCtx.currentTime

      // Chime 1
      const osc1 = this.audioCtx.createOscillator()
      const gain1 = this.audioCtx.createGain()
      osc1.type = 'triangle'
      osc1.frequency.setValueAtTime(987.77, now) // B5
      gain1.gain.setValueAtTime(0.2, now)
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
      osc1.connect(gain1)
      gain1.connect(this.audioCtx.destination)
      osc1.start(now)
      osc1.stop(now + 0.3)

      // Chime 2 (High E)
      const osc2 = this.audioCtx.createOscillator()
      const gain2 = this.audioCtx.createGain()
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(1318.51, now + 0.08) // E6
      gain2.gain.setValueAtTime(0.25, now + 0.08)
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
      osc2.connect(gain2)
      gain2.connect(this.audioCtx.destination)
      osc2.start(now + 0.08)
      osc2.stop(now + 0.5)
    } catch (_) {}
  }

  // Soft click sound for buttons
  playClick() {
    if (!this.enabled) return
    try {
      this.init()
      if (!this.audioCtx) return

      const now = this.audioCtx.currentTime
      const osc = this.audioCtx.createOscillator()
      const gain = this.audioCtx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(600, now)
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.04)

      gain.gain.setValueAtTime(0.05, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04)

      osc.connect(gain)
      gain.connect(this.audioCtx.destination)

      osc.start(now)
      osc.stop(now + 0.04)
    } catch (_) {}
  }

  // Success chime
  playSuccess() {
    if (!this.enabled) return
    try {
      this.init()
      if (!this.audioCtx) return

      const now = this.audioCtx.currentTime
      const notes = [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = this.audioCtx.createOscillator()
        const gain = this.audioCtx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + idx * 0.06)
        gain.gain.setValueAtTime(0.12, now + idx * 0.06)
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.25)
        osc.connect(gain)
        gain.connect(this.audioCtx.destination)
        osc.start(now + idx * 0.06)
        osc.stop(now + idx * 0.06 + 0.25)
      })
    } catch (_) {}
  }
}

export const sounds = new SoundController()
export default sounds
