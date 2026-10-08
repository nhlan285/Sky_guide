import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import process from 'node:process'
import { createManagementApiTransport } from '../sql/management-api-transport.mjs'

test('fake credential never appears in receipts; routes are fixed and workers independent', {skip:process.platform!=='win32'?'Native Windows credential worker; run on Windows':false},async()=>{
 const workers=await Promise.all([1,2,3].map(()=>createManagementApiTransport({fakeCredential:true})))
 try {
  const receipts=await Promise.all(workers.map(w=>w.request('query','select 1')))
  for(const receipt of receipts){assert.equal(receipt.status,200);assert.equal(receipt.method,'POST');assert.equal(receipt.url,'https://api.supabase.com/v1/projects/tpbydviuknovimroeodm/database/query');assert.ok(!JSON.stringify(receipt).includes('sbp_'))}
  assert.equal((await workers[0].request('cleanup')).method,'DELETE')
  assert.equal((await workers[0].request('project')).method,'GET')
  await assert.rejects(workers[0].request('https://evil.example'))
 } finally {workers.forEach(w=>w.close())}
})
test('credential reader only reads exact existing targets; no redirect, writes, CLI or secret output',()=>{
 const source=readFileSync(new URL('../sql/management-api-worker.ps1',import.meta.url),'utf8')
 assert.match(source,/CredReadW/);assert.match(source,/CredFree/);assert.match(source,/AllowAutoRedirect = \$false/)
 assert.doesNotMatch(source,/CredWrite|CredDelete|CredEnumerate|supabase\.exe|WriteLine\(\$privateToken|Set-Content|WriteAllText/)
 assert.match(source,/body\.Contains\(\$privateToken\)/)
})
