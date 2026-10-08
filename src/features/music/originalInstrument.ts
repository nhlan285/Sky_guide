import { MAX_MUSIC_VOICES, MUSIC_NOTE_SECONDS, originalNotes } from './notes.ts'

// Original synthesized notes, not game samples. AudioContext is allocated only
// from the caller's user gesture; no downloads, microphone or global singleton.
export function createOriginalInstrument(factory: () => AudioContext, changed: (ids: string[]) => void) {
  let context: AudioContext | null = null, master: GainNode | null = null, disposed = false
  let volume = 0.45, muted = false, generation = 0
  const voices = new Map<OscillatorNode, { id: string; gain: GainNode }>()
  const publish = () => { if (!disposed) changed([...voices.values()].map(voice => voice.id)) }
  function finish(oscillator: OscillatorNode) {
    const voice = voices.get(oscillator)
    if (!voice) return
    voices.delete(oscillator); oscillator.disconnect(); voice.gain.disconnect(); publish()
  }
  function stop() {
    generation++
    for (const oscillator of [...voices.keys()]) { oscillator.stop(); finish(oscillator) }
  }
  async function activate() {
    if (disposed) throw new Error('Instrument closed')
    if (!context) { context = factory(); master = context.createGain(); master.gain.value = muted ? 0 : volume; master.connect(context.destination) }
    if (context.state !== 'running') await context.resume()
    if (disposed || context.state !== 'running') throw new Error('Audio unavailable')
  }
  async function play(id: string) {
    const note = originalNotes.find(value => value.id === id)
    if (!note || muted || volume === 0 || disposed) return false
    const requestedGeneration = generation
    await activate()
    if (disposed || muted || volume === 0 || generation !== requestedGeneration) return false
    if (voices.size >= MAX_MUSIC_VOICES) { const first = voices.keys().next().value!; first.stop(); finish(first) }
    const oscillator = context!.createOscillator(), gain = context!.createGain(), now = context!.currentTime
    oscillator.type = 'sine'; oscillator.frequency.value = note.frequency
    // Short, smooth original pluck; maximum gain accounts for bounded polyphony.
    gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.12, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + MUSIC_NOTE_SECONDS)
    oscillator.connect(gain); gain.connect(master!); voices.set(oscillator, { id, gain })
    oscillator.onended = () => finish(oscillator)
    oscillator.start(now); oscillator.stop(now + MUSIC_NOTE_SECONDS); publish(); return true
  }
  function setVolume(value: number) {
    if (!Number.isFinite(value)) return
    volume = Math.min(1, Math.max(0, value))
    if (master && context) master.gain.setTargetAtTime(muted ? 0 : volume, context.currentTime, 0.01)
    if (volume === 0) stop()
  }
  function setMuted(value: boolean) { muted = value; if (value) stop(); if (master && context) master.gain.setTargetAtTime(muted ? 0 : volume, context.currentTime, 0.01) }
  function suspend() { stop(); if (context?.state === 'running') void context.suspend().catch(() => {}) }
  function dispose() { if (disposed) return; stop(); disposed = true; if (context && context.state !== 'closed') void context.close().catch(() => {}); master?.disconnect() }
  return { activate, play, stop, suspend, dispose, setVolume, setMuted }
}
