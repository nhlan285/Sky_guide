export const ORIGINAL_VIDEO_LIMIT = 300_000
export const ORIGINAL_AUDIO_LIMIT = 100_000
export const originalMediaSamples = [
  { id: 'self-created-wave-v1', kind: 'video', rights: 'self-created', seconds: 3, maxBytes: ORIGINAL_VIDEO_LIMIT },
  { id: 'self-created-call-v1', kind: 'audio', rights: 'self-created', seconds: 2, maxBytes: ORIGINAL_AUDIO_LIMIT },
] as const
export type OriginalMediaSample = typeof originalMediaSamples[number]

// A short original chirp, not a Sky honk or extracted game audio.
export function createOriginalCallWav(): Uint8Array {
  const rate = 22_050, frames = rate * 2, bytes = new Uint8Array(44 + frames * 2), view = new DataView(bytes.buffer)
  const text = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) bytes[offset + i] = value.charCodeAt(i) }
  text(0, 'RIFF'); view.setUint32(4, bytes.length - 8, true); text(8, 'WAVE'); text(12, 'fmt ')
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true)
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true)
  text(36, 'data'); view.setUint32(40, frames * 2, true)
  for (let i = 0; i < frames; i++) {
    const t = i / rate, envelope = Math.min(1, t / 0.04) * Math.max(0, 1 - t / 2) ** 2
    const phase = 2 * Math.PI * (320 * t + 70 * t * t)
    view.setInt16(44 + i * 2, Math.round(Math.sin(phase) * envelope * 8_000), true)
  }
  return bytes
}

// Bounded local generation after explicit interaction. No asset work at route
// entry. Caller aborts on hidden/leave/switch; every track/timer is released.
export function createOriginalWaveVideo(signal: AbortSignal): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (signal.aborted || typeof MediaRecorder === 'undefined') { reject(new Error('Preview unavailable')); return }
    const mime = 'video/webm;codecs=vp8'
    if (!MediaRecorder.isTypeSupported(mime)) { reject(new Error('Video format unavailable')); return }
    const canvas = document.createElement('canvas'); canvas.width = 480; canvas.height = 480
    const ctx = canvas.getContext('2d')
    if (!ctx || typeof canvas.captureStream !== 'function') { reject(new Error('Video capture unavailable')); return }
    let stream: MediaStream | null = null, recorder: MediaRecorder
    try { stream = canvas.captureStream(24); recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 300_000 }) }
    catch { stream?.getTracks().forEach(track => track.stop()); reject(new Error('Preview unavailable')); return }
    let finished = false, frame = 0, timer: ReturnType<typeof setTimeout>, size = 0
    const chunks: Blob[] = [], start = performance.now()
    const cleanup = () => { cancelAnimationFrame(frame); clearTimeout(timer); stream?.getTracks().forEach(track => track.stop()); signal.removeEventListener('abort', abort) }
    const fail = () => { if (finished) return; finished = true; if (recorder.state !== 'inactive') recorder.stop(); cleanup(); reject(new Error('Preview cancelled or unavailable')) }
    const abort = () => fail()
    signal.addEventListener('abort', abort, { once: true })
    const draw = () => {
      const t = (performance.now() - start) / 1_000
      ctx.fillStyle = '#142539'; ctx.fillRect(0, 0, 480, 480)
      ctx.strokeStyle = '#d3e9f5'; ctx.fillStyle = '#d3e9f5'; ctx.lineWidth = 15; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.arc(240, 145, 40, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.moveTo(240, 198); ctx.lineTo(240, 310); ctx.moveTo(240, 235); ctx.lineTo(165, 280)
      ctx.moveTo(240, 235); ctx.lineTo(310, 200); ctx.lineTo(335 + Math.sin(t * 8) * 22, 110); ctx.moveTo(240, 310); ctx.lineTo(195, 385); ctx.moveTo(240, 310); ctx.lineTo(285, 385); ctx.stroke()
      frame = requestAnimationFrame(draw)
    }
    recorder.ondataavailable = event => { if (!event.data.size) return; size += event.data.size; if (size > ORIGINAL_VIDEO_LIMIT) fail(); else chunks.push(event.data) }
    recorder.onerror = fail
    recorder.onstop = () => {
      if (finished) return
      finished = true; cleanup()
      const blob = new Blob(chunks, { type: mime })
      if (!blob.size || blob.size > ORIGINAL_VIDEO_LIMIT) reject(new Error('Preview exceeds budget'))
      else resolve(blob)
    }
    try { draw(); recorder.start(250); timer = setTimeout(() => { if (recorder.state !== 'inactive') recorder.stop() }, 3_000) } catch { fail() }
  })
}
