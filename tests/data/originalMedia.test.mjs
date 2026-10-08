import assert from 'node:assert/strict'
import test from 'node:test'
import { TextDecoder } from 'node:util'
import { createOriginalCallWav, createOriginalWaveVideo, originalMediaSamples, ORIGINAL_AUDIO_LIMIT, ORIGINAL_VIDEO_LIMIT } from '../../src/features/media/originalAssets.ts'

test('original mono PCM call has an exact bounded duration/header and non-silent fade without game media',()=>{
  const bytes=createOriginalCallWav(), view=new DataView(bytes.buffer)
  assert.equal(bytes.length,88_244);assert.ok(bytes.length<ORIGINAL_AUDIO_LIMIT)
  assert.equal(new TextDecoder().decode(bytes.slice(0,4)),'RIFF');assert.equal(new TextDecoder().decode(bytes.slice(8,12)),'WAVE')
  assert.equal(view.getUint16(22,true),1);assert.equal(view.getUint32(24,true),22_050)
  assert.equal(view.getUint32(40,true)/2/22_050,2)
  let peak=0; for(let offset=44;offset<bytes.length;offset+=2) peak=Math.max(peak,Math.abs(view.getInt16(offset,true)))
  assert.ok(peak>1_000&&peak<=8_000);assert.equal(view.getInt16(44,true),0)
  assert.ok(Math.abs(view.getInt16(bytes.length-2,true))<2)
  assert.ok(originalMediaSamples.every(sample=>sample.rights==='self-created'&&sample.id.startsWith('self-created-')))
})
test('unsupported and pre-aborted video generation fail closed before allocating capture',async()=>{
  const controller=new globalThis.AbortController();controller.abort()
  await assert.rejects(createOriginalWaveVideo(controller.signal),/unavailable/)
  await assert.rejects(createOriginalWaveVideo(new globalThis.AbortController().signal),/unavailable/)
})

function recorderHarness(t, {size=60_000,constructorFailure=false}={}) {
  const names=['document','MediaRecorder','requestAnimationFrame','cancelAnimationFrame'], previous=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]))
  let stopped=0,cancelled=0
  const track={stop(){stopped++}},stream={getTracks:()=>[track]},ctx=Object.fromEntries(['fillRect','beginPath','arc','fill','moveTo','lineTo','stroke'].map(name=>[name,()=>{}]))
  globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx,captureStream:fps=>{assert.equal(fps,24);return stream}})}
  globalThis.requestAnimationFrame=()=>7;globalThis.cancelAnimationFrame=()=>{cancelled++}
  globalThis.MediaRecorder=class {
    static isTypeSupported(){return true}
    constructor(_stream,options){assert.equal(options.videoBitsPerSecond,300_000);if(constructorFailure) throw new Error('synthetic recorder failure');this.state='inactive'}
    start(){this.state='recording'}
    stop(){this.state='inactive';this.ondataavailable({data:new globalThis.Blob([new Uint8Array(size)])});this.onstop()}
  }
  t.mock.timers.enable({apis:['setTimeout']})
  t.after(()=>{t.mock.timers.reset();for(const name of names){const descriptor=previous.get(name);if(descriptor) Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name]}})
  return {get stopped(){return stopped},get cancelled(){return cancelled}}
}
test('3s original video resolves within byte budget and releases every track/frame timer',async t=>{
  const capture=recorderHarness(t),promise=createOriginalWaveVideo(new globalThis.AbortController().signal)
  t.mock.timers.tick(3_000);const blob=await promise
  assert.equal(blob.size,60_000);assert.equal(blob.type,'video/webm;codecs=vp8')
  assert.equal(capture.stopped,1);assert.equal(capture.cancelled,1)
})
test('abort and over-budget recording reject and release resources, including constructor failure',async t=>{
  const capture=recorderHarness(t),controller=new globalThis.AbortController(),promise=createOriginalWaveVideo(controller.signal)
  controller.abort();await assert.rejects(promise,/cancelled/);assert.equal(capture.stopped,1)
})
test('oversize video never returns an asset',async t=>{
  const capture=recorderHarness(t,{size:ORIGINAL_VIDEO_LIMIT+1}),promise=createOriginalWaveVideo(new globalThis.AbortController().signal)
  t.mock.timers.tick(3_000);await assert.rejects(promise);assert.equal(capture.stopped,1)
})
test('failed recorder construction releases capture tracks',async t=>{
  const capture=recorderHarness(t,{constructorFailure:true})
  await assert.rejects(createOriginalWaveVideo(new globalThis.AbortController().signal));assert.equal(capture.stopped,1)
})
