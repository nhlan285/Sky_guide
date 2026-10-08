const pitches = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81, 83, 84]
const labels = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C6']
const keys = 'qwertasdfgzxcvb'
export const originalNotes = pitches.map((midi, index) => ({ id: `original-note-${index + 1}`, label: labels[index], key: keys[index], frequency: 440 * 2 ** ((midi - 69) / 12) }))
export const MAX_MUSIC_VOICES = 8
export const MUSIC_NOTE_SECONDS = 1.2
export function noteForKey(key: string) { return originalNotes.find(note => note.key === key.toLowerCase()) }
