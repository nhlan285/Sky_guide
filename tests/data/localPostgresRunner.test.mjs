import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import { buildLocalPostgresReplay } from '../sql/build-local-postgres-replay.mjs'
import { nativeJson,verifyLocalHistory } from '../sql/run-local-postgres-rehearsal.mjs'
const structuredClone=globalThis.structuredClone

test('local native receipts require an acknowledged boundary and exactly one JSON row',()=>{
 const raw='BEGIN\nSET\n{"version":"170011"}\nCOMMIT\n'
 assert.deepEqual(nativeJson(raw,'COMMIT'),{version:'170011'})
 assert.throws(()=>nativeJson(raw.replace('COMMIT','ROLLBACK'),'COMMIT'))
 assert.throws(()=>nativeJson(raw.replace('COMMIT','{"version":"170011"}\nCOMMIT'),'COMMIT'))
 assert.throws(()=>nativeJson('BEGIN\nSET\nCOMMIT\n','COMMIT'))
})
test('local history rejects missing, reordered or altered migration source bytes',()=>{
 const p=buildLocalPostgresReplay()
 const expected={migrations:p.migrations.map(m=>({version:m.version,name:m.name.slice(15,-4),statements:[readFileSync(new URL(`../../supabase/migrations/${m.name}`,import.meta.url),'utf8')]}))}
 assert.deepEqual(verifyLocalHistory(expected,p),{migrations:16,sourceBytesExact:true})
 const missing=structuredClone(expected);missing.migrations.pop();assert.throws(()=>verifyLocalHistory(missing,p))
 const reordered=structuredClone(expected);reordered.migrations.reverse();assert.throws(()=>verifyLocalHistory(reordered,p))
 const changed=structuredClone(expected);changed.migrations[0].statements[0]+='\n';assert.throws(()=>verifyLocalHistory(changed,p))
})
