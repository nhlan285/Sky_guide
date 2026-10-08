import assert from 'node:assert/strict'
import test from 'node:test'
import { originalNotes, noteForKey, MAX_MUSIC_VOICES } from '../../src/features/music/notes.ts'
import { createOriginalInstrument } from '../../src/features/music/originalInstrument.ts'

function fakeAudio() {
  const nodes=[],calls=[]
  const param=()=>({value:0,setValueAtTime(...args){calls.push(['set',...args])},linearRampToValueAtTime(...args){calls.push(['attack',...args])},exponentialRampToValueAtTime(...args){calls.push(['decay',...args])},setTargetAtTime(...args){calls.push(['volume',...args])}})
  const context={state:'suspended',currentTime:10,destination:{},async resume(){this.state='running'},async suspend(){this.state='suspended'},async close(){this.state='closed'},createGain(){return {gain:param(),connect(){},disconnect(){calls.push(['disconnect-gain'])}}},createOscillator(){const oscillator={frequency:param(),onended:null,type:null,connect(){},disconnect(){calls.push(['disconnect-osc'])},start(at){calls.push(['start',at])},stop(at){calls.push(['stop',at])}};nodes.push(oscillator);return oscillator}}
  let allocations=0,active=[]
  const instrument=createOriginalInstrument(()=>{allocations++;return context},ids=>{active=ids})
  return {context,nodes,calls,instrument,get allocations(){return allocations},get active(){return active}}
}
test('original 3x5 notes map unique keys and correct diatonic frequencies',()=>{
  assert.equal(originalNotes.length,15);assert.equal(new Set(originalNotes.map(n=>n.id)).size,15)
  assert.equal(new Set(originalNotes.map(n=>n.key)).size,15)
  assert.equal(originalNotes.find(n=>n.label==='A4').frequency,440)
  assert.equal(originalNotes.at(-1).frequency/originalNotes[0].frequency,4)
  assert.equal(noteForKey('Q').id,originalNotes[0].id);assert.equal(noteForKey('ArrowDown'),undefined)
})
test('no context/autoplay at creation; only requested original note allocates one active context',async()=>{
  const audio=fakeAudio();assert.equal(audio.allocations,0);assert.deepEqual(audio.calls,[])
  assert.equal(await audio.instrument.play('unknown'),false);assert.equal(audio.allocations,0)
  assert.equal(await audio.instrument.play(originalNotes[0].id),true)
  assert.equal(audio.allocations,1);assert.equal(audio.nodes[0].type,'sine');assert.equal(audio.nodes[0].frequency.value,originalNotes[0].frequency)
  assert.deepEqual(audio.active,[originalNotes[0].id]);assert.ok(audio.calls.some(c=>c[0]==='decay'))
  audio.nodes[0].onended();assert.deepEqual(audio.active,[])
  await audio.instrument.play(originalNotes[1].id);assert.equal(audio.allocations,1)
})
test('polyphony bounded; mute/zero/stop disconnect voices and unmute restores user choice',async()=>{
  const audio=fakeAudio()
  await Promise.all(originalNotes.map(n=>audio.instrument.play(n.id)))
  assert.equal(audio.active.length,MAX_MUSIC_VOICES)
  audio.instrument.setMuted(true);assert.deepEqual(audio.active,[])
  assert.equal(await audio.instrument.play(originalNotes[0].id),false)
  audio.instrument.setMuted(false);audio.instrument.setVolume(0);assert.equal(await audio.instrument.play(originalNotes[0].id),false)
  audio.instrument.setVolume(0.5);assert.equal(await audio.instrument.play(originalNotes[0].id),true)
  audio.instrument.stop();assert.deepEqual(audio.active,[])
  audio.nodes[0].onended();assert.deepEqual(audio.active,[],'stale ended callback cannot resurrect a voice')
})
test('suspend/dispose silence and cancel a pending user activation without late playback',async()=>{
  const audio=fakeAudio();let resume
  audio.context.resume=()=>new Promise(resolve=>{resume=()=>{audio.context.state='running';resolve()}})
  const pending=audio.instrument.play(originalNotes[0].id)
  audio.instrument.suspend();resume();assert.equal(await pending,false);assert.equal(audio.nodes.length,0)
  audio.context.resume=async()=>{audio.context.state='running'}
  await audio.instrument.play(originalNotes[0].id);audio.instrument.suspend();assert.equal(audio.context.state,'suspended');assert.deepEqual(audio.active,[])
  audio.instrument.dispose();assert.equal(audio.context.state,'closed');assert.equal(await audio.instrument.play(originalNotes[0].id),false)
  assert.deepEqual(audio.active,[])
  await assert.rejects(audio.instrument.activate(),/closed/)
})
