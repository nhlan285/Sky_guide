import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { fileURLToPath,URL } from 'node:url'

// No token crosses this module. Each worker reads the existing CLI credential
// into its own memory. No CLI database configuration or credential writes.
export async function createManagementApiTransport({ fakeCredential = false } = {}) {
 const worker = spawn('pwsh', ['-NoLogo','-NoProfile','-NonInteractive','-File',fileURLToPath(new URL('./management-api-worker.ps1',import.meta.url)),...(fakeCredential?['-FakeCredential']:[])], {windowsHide:true,stdio:['pipe','pipe','pipe']})
 const lines = createInterface({input:worker.stdout})
 const pending = []
 const buffered = []
 let ended = false
 lines.on('line',line=>{let value;try{value=JSON.parse(line)}catch{value={error:'Invalid worker receipt'}};const next=pending.shift();if(next)next(value);else buffered.push(value)})
 // Never forward raw process errors/stderr: credential-reader exceptions are private.
 worker.stderr.resume()
 const stop=()=>{ended=true;for(const next of pending.splice(0))next({error:'Worker ended'});lines.close()}
 worker.on('error',stop);worker.on('close',stop)
 const read=()=>buffered.length?Promise.resolve(buffered.shift()):ended?Promise.resolve({error:'Worker ended'}):new Promise(resolve=>pending.push(resolve))
 assert.deepEqual(await read(),{ready:true},'Credential worker not ready')
 let busy=false
 return {
  async request(operation,query) {
   assert.ok(['project','query','cleanup'].includes(operation))
   assert.ok(!busy,'One request per worker; use independent workers for concurrency')
   if(operation==='query')assert.equal(typeof query,'string')
   busy=true
   try {
    worker.stdin.write(JSON.stringify({operation,...(operation==='query'?{query}:{}),...(operation==='cleanup'?{authority:'8514bec+101f788-direct-user-approval'}:{})})+'\n')
    const result=await read()
    assert.ok(!result.error,result.error)
    return result
   } finally { busy=false }
  },
  close(){worker.stdin.end()}
 }
}
